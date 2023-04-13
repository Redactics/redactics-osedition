from datetime import timedelta
from datetime import datetime
from dateutil.relativedelta import relativedelta
from urllib.parse import urlparse
from sqlalchemy import create_engine, select, func, Table, Column, MetaData, and_
from airflow.decorators import dag, task

import glob
import airflow
import json
import os
import requests
import re
from airflow import DAG
from airflow import AirflowException
from airflow.hooks.base_hook import BaseHook
from airflow.operators.dummy_operator import DummyOperator
from airflow.operators.postgres_operator import PostgresOperator
from airflow.operators.python_operator import PythonOperator
from kubernetes import client
from kubernetes.client import models as k8s
from airflow.providers.cncf.kubernetes.operators.kubernetes_pod import KubernetesPodOperator
from airflow.kubernetes.secret import Secret
from airflow.models import Variable

cf_file = open("/opt/airflow/dags/functions.sql", "r")
CUSTOM_FUNCTIONS = cf_file.read()
cf_file.close()
dag_name = os.path.basename(__file__).split('.')[0]

ENV = os.environ['ENV']
API_URL = os.environ['API_URL']
NAS_HOST = "http://agent-http-nas:3000"
REGISTRY_URL = "redactics"

NAMESPACE = os.environ['NAMESPACE']
AGENT_VERSION = os.environ['AGENT_VERSION']
NODESELECTOR = os.environ['NODESELECTOR']
if "DIGITAL_TWIN_PREPARED_STATEMENTS" in os.environ:
    DIGITAL_TWIN_PREPARED_STATEMENTS = os.environ['DIGITAL_TWIN_PREPARED_STATEMENTS']
PG_CLIENT_VERSION = "15"

is_delete_operator_pod = False if ENV == "development" else True
secrets = []

k8s_pg_tmp_envvars = {
    "PGHOST": BaseHook.get_connection("redacticsDB").host,
    "PGUSER": BaseHook.get_connection("redacticsDB").login,
    "PGPASSWORD": BaseHook.get_connection("redacticsDB").password,
    "PGDATABASE": BaseHook.get_connection("redacticsDB").schema,
    "API_URL": API_URL,
    "CONNECTION": "redactics-tmp"
}

if NODESELECTOR != "<nil>":
    nodeselector_key = NODESELECTOR.split('.')[0]
    nodeselector_value = NODESELECTOR.split('.')[1]
    affinity = {
        "nodeAffinity": {
            "requiredDuringSchedulingIgnoredDuringExecution": {
                "nodeSelectorTerms": [{
                    "matchExpressions": [{
                        "key": nodeselector_key,
                        "operator": "In",
                        "values": [nodeselector_value]
                    }]
                }]
            }
        }
    }
else:
    affinity = {}

default_args = {
    #'depends_on_past': False,
    'retries': 0 if ENV == "development" else 30,
    'retry_delay': timedelta(seconds=15),
    'email_on_failure': False
    # 'queue': 'bash_queue',
    # 'pool': 'backfill',
    # 'priority_weight': 10,
    # 'end_date': datetime(2016, 1, 1),
}

headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
apiUrl = API_URL + '/workflow/' + dag_name
request = requests.get(apiUrl, headers=headers)
wf_config = request.json()
print(wf_config)

def redact_email(table, fieldName, **params):
    return "SECURITY LABEL FOR anon ON COLUMN " + table + "." + fieldName + " IS 'MASKED WITH FUNCTION redact_email(" + table + "." + fieldName + ", " + table + ".redacted_email_counter, ''" + params["params"]["prefix"] + "'', ''" + params["params"]["domain"] + "'')';"

def destruction(table, fieldName):
    return "SECURITY LABEL FOR anon ON COLUMN " + table + "." + fieldName + " IS 'MASKED WITH VALUE NULL';"

def replacement(table, fieldName, **params):
    return "SECURITY LABEL FOR anon ON COLUMN " + table + "." + fieldName + " IS 'MASKED WITH VALUE ''" + params["params"]["replacement"] + "''';"

def random_string(table, fieldName, **params):
    return "SECURITY LABEL FOR anon ON COLUMN " + table + "." + fieldName + " IS 'MASKED WITH FUNCTION anon.random_string(" + params["params"]["chars"] + ")';"

security_labels = []
outputs = {}
dataFeeds = {}

if wf_config.get("export") and len(wf_config["export"]):
    for output in wf_config["export"]:
        for table, options in output.items():
            outputs[table] = options

if len(wf_config["dataFeeds"]):
    for dataFeed in wf_config["dataFeeds"]:
        for feed, options in dataFeed.items():
            dataFeeds[feed] = options

digitalTwinEnabled = False
digitalTwinConfig = {}
s3UploadEnabled = False
s3UploadConfig = {}
customEnabled = False
customConfig = {}

# init data feed vars
if wf_config.get("dataFeeds") and len(dataFeeds):
    for feed, options in dataFeeds.items():
        if feed == "digitalTwin":
            digitalTwinEnabled = True
            digitalTwinConfig = options
        elif feed == "s3upload":
            s3UploadEnabled = True
            s3UploadConfig = options
        elif feed == "custom":
            customEnabled = True
            customConfig = options

def get_source_db(input_id):
    host = BaseHook.get_connection(input_id).host
    login = BaseHook.get_connection(input_id).login
    password = BaseHook.get_connection(input_id).password
    schema = BaseHook.get_connection(input_id).schema
    extra = json.loads(BaseHook.get_connection(input_id).extra) if BaseHook.get_connection(input_id).extra else ""

    connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                            .format(login=login, password=password,
                                    host=host, schema=schema), connect_args=extra, echo=False)
    return connection

def get_redactics_tmp():
    host = BaseHook.get_connection("redacticsDB").host
    login = BaseHook.get_connection("redacticsDB").login
    password = BaseHook.get_connection("redacticsDB").password
    schema = BaseHook.get_connection("redacticsDB").schema
    extra = json.loads(BaseHook.get_connection("redacticsDB").extra) if BaseHook.get_connection("redacticsDB").extra else ""

    connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                            .format(login=login, password=password,
                                    host=host, schema=schema), connect_args=extra, echo=False)
    return connection

def get_digital_twin():
    host = BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).host
    login = BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).login
    password = BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).password
    schema = BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).schema
    extra = json.loads(BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).extra) if BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).extra else ""

    connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                            .format(login=login, password=password,
                                    host=host, schema=schema), connect_args=extra, echo=False)
    return connection

def db_init():
    # check that extension has been inited
    connection = get_redactics_tmp()
    results = connection.execute("SELECT oid FROM pg_extension WHERE extname='anon'").scalar()
    return False if results is None else True

initial_copy_tasks = 0
delta_copy_tasks = 0
redactics_db_init = db_init()
totalTasks = 0

def set_input_tables(input, source_db, context):
    # collect tables from workflow config, supporting wildcards
    found_tables = []
    append_sql = []
    schema_sql = "table_schema NOT LIKE 'pg_%%' AND table_schema != 'information_schema'"
    table_sql = ""
    tables = []        
    if input["tableSelection"] == "all":
        tables = source_db.execute("SELECT * FROM information_schema.columns WHERE table_schema NOT LIKE 'pg_%%' AND table_schema != 'information_schema'").fetchall()
    elif input["tableSelection"] == "specific" or input["tableSelection"] == "allExclude":
        for t in input["tables"]:
            schema = t.split('.')[0]
            table = t.split('.')[1]

            if "*" in schema:
                schema = schema.replace("*", "%%")
            if "*" in table:
                table = table.replace("*", "%%")
            sql = "(table_schema ILIKE '" + schema + "' AND "
            sql += "table_name ILIKE '" + table + "')" if input["tableSelection"] == "specific" else "table_name NOT ILIKE '" + table + "')"
            append_sql.append(sql)

        idx=0
        for sql in append_sql:
            if (idx + 1) < len(append_sql):
                table_sql += append_sql[idx] + " OR " if input["tableSelection"] == "specific" else append_sql[idx] + " AND "
            else:
                table_sql += append_sql[idx]
            idx+=1

        print("SELECT * FROM information_schema.columns WHERE " + schema_sql + " AND " + table_sql)
        tables = source_db.execute("SELECT * FROM information_schema.columns WHERE " + schema_sql + " AND " + table_sql).fetchall()
    if len(tables):
        for idx, t in enumerate(tables):
                found_tables.append(t["table_schema"] + "." + t["table_name"])
    print("FOUND TABLES")
    print(list(dict.fromkeys(found_tables)))
    Variable.set(dag_name + "-erl-input-tables-" + input["id"] + "-" + context["run_id"], json.dumps(list(dict.fromkeys(found_tables))))
    return list(dict.fromkeys(found_tables))

def is_numeric_pk(data_type):
    return True if data_type == "smallint" or data_type == "integer" or data_type == "bigint" or data_type == "smallserial" or data_type == "serial" or data_type == "bigserial" else False

def set_run_plan(**context):
    delta_copies = []
    initial_copies = []
    copy_status = {}
    digital_twin = get_digital_twin()
    redactics_tmp = get_redactics_tmp()
    for input in wf_config["inputs"]:
        source_db = get_source_db(input["id"])
        #Variable.set(dag_name + "-erl-currentWorkflowJobId", response["uuid"])
        input_tables = set_input_tables(input, source_db, context)
        for t in input_tables:
            schema = t.split('.')[0]
            table = t.split('.')[1]
            schema_diff = False

            source_tables = source_db.execute("SELECT * FROM information_schema.columns WHERE table_schema ILIKE '" + schema + "' AND table_name ILIKE '" + table + "' ORDER BY ordinal_position ASC").fetchall()
            tmp_tables = redactics_tmp.execute("SELECT * FROM information_schema.columns WHERE table_schema ILIKE '" + dag_name + "' AND table_name ILIKE '" + table + "' ORDER BY ordinal_position ASC").fetchall()
            if digitalTwinEnabled:
                twin_tables = digital_twin.execute("SELECT * FROM information_schema.columns WHERE table_schema ILIKE '" + schema + "' AND table_name ILIKE '" + table + "' AND column_name != 'source_primary_key' ORDER BY ordinal_position ASC").fetchall()
                twin_primary_key = ""
                twin_primary_key_type = ""
                if len(twin_tables):
                    pk_query = digital_twin.execute("SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = '" + table + "'::regclass AND i.indisprimary").fetchall()
                    if len(pk_query):
                        pk_result = pk_query[0]
                        twin_primary_key = pk_result["attname"]
                        twin_primary_key_type = pk_result["data_type"]

            if len(source_tables) != len(tmp_tables):
                # column has been added or removed
                schema_diff = True
            elif digitalTwinEnabled and len(tmp_tables) != len(twin_tables):
                # column has been added or removed
                schema_diff = True
            else:
                for idx, st in enumerate(source_tables):
                    if len(tmp_tables) > 0 and idx <= len(tmp_tables):
                        if (st["column_name"] != tmp_tables[idx]["column_name"] or
                            st["is_nullable"] != tmp_tables[idx]["is_nullable"] or
                            st["data_type"] != tmp_tables[idx]["data_type"] or
                            st["udt_name"] != tmp_tables[idx]["udt_name"]):
                            print("TMP DIFF")
                            print(table)
                            print(st)
                            print(tmp_tables[idx])
                            schema_diff = True    
                    else:
                        # destination tables haven't been created yet
                        print("NO DEST TMP")
                        print(table)
                        schema_diff = True

                if digitalTwinEnabled:
                    # assure table includes deltaUpdateField to support delta updates
                    deltaUpdateFieldFound = False

                    # mismatching digital twin schema should prompt table regeneration 
                    for idx, st in enumerate(tmp_tables):
                        if st["column_name"] == digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"]:
                            deltaUpdateFieldFound = True
                        if twin_primary_key and is_numeric_pk(twin_primary_key_type) and len(twin_tables) > 0 and idx <= len(twin_tables):
                            if (st["column_name"] != twin_tables[idx]["column_name"] or
                                st["ordinal_position"] != twin_tables[idx]["ordinal_position"] or
                                st["column_default"] != twin_tables[idx]["column_default"] or
                                st["is_nullable"] != twin_tables[idx]["is_nullable"] or
                                st["data_type"] != twin_tables[idx]["data_type"] or
                                st["udt_name"] != twin_tables[idx]["udt_name"]) and (twin_tables[idx]["column_name"] != twin_primary_key):
                                print("DT DIFF")
                                print(table)
                                print(st)
                                print(twin_tables[idx])
                                schema_diff = True   
                        else:
                            # destination tables haven't been created yet
                            print("NO DEST DT")
                            print(table)
                            print(twin_primary_key)
                            print(twin_primary_key_type)
                            schema_diff = True

            if not redactics_db_init:
                # Redactics DB not inited - first time usage
                copy_status[(schema + "." + table)] = "init"
                initial_copies.append(schema + "." + table)
            elif (schema + "." + table) in input["fullcopies"] and schema_diff:
                # table copied but schema has changed - re-copy entire table
                copy_status[(schema + "." + table)] = "schema-change-detected"
                initial_copies.append(schema + "." + table)
            elif (schema + "." + table) in input["fullcopies"] and digitalTwinEnabled and digitalTwinConfig["dataFeedConfig"]["enableDeltaUpdates"] and digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"] and deltaUpdateFieldFound:
                # table copied but schema has not changed - eligible for delta update
                copy_status[(schema + "." + table)] = "delta"
                delta_copies.append(schema + "." + table)
            else:
                # table not copied yet, or missing delta update field definition or value
                copy_status[(schema + "." + table)] = "missing-delta-update-field" if digitalTwinEnabled and not digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"] else "initial-copy"
                initial_copies.append(schema + "." + table)
    
    print("COPY STATUS")
    print(copy_status)
    print("INITIAL")
    print(initial_copies)
    print("DELTA")
    print(delta_copies)
    print("INPUT")
    print(input["fullcopies"])
    return {
        "copy_status": copy_status,
        "initial_copies": initial_copies,
        "delta_copies": delta_copies
    } 

def tally_dynamic_tasks(initial_copies, delta_copies):
    global totalTasks
    global initial_copy_tasks
    global delta_copy_tasks
    if not db_init():
        totalTasks += 1
    # dynamic tasks based on the number of initial copies
    totalTasks += len(initial_copies) * initial_copy_tasks
    totalTasks += len(delta_copies) * delta_copy_tasks
    totalTasks += len(security_labels)

    # sequences
    for input in wf_config["inputs"]:
        if len(initial_copies):
            connection = get_source_db(input["id"])
        for t in initial_copies:
            schema = t.split('.')[0]
            table = t.split('.')[1]

            cols = connection.execute("SELECT column_default FROM information_schema.columns WHERE column_default LIKE 'nextval(%%' AND table_name ILIKE '" + table + "' AND table_schema ILIKE '" + schema + "'").fetchall()
            # sequence dump and restore
            totalTasks += len(cols) * 2
        
    return totalTasks

try:
    if request.status_code != 200:
        raise AirflowException(request)
    @dag(
        dag_id=dag_name,
        default_args=default_args,
        description='Redactics workflow',
        start_date=airflow.utils.dates.days_ago(1),
        schedule_interval=wf_config["schedule"] if wf_config["schedule"] != 'None' else None,
        catchup=False,
        max_active_runs=1,
        max_active_tasks=5
    )
    def redactics_workflow():
        global totalTasks
        global initial_copy_tasks
        global delta_copy_tasks

        def post_logs(context):
            try:
                print(context)
                tryNumber = context["task_instance"].try_number
                exception = context["exception"]

                logs = open(glob.glob("/opt/airflow/logs/dag_id=" + context["dag"].dag_id + "/run_id=" + context["run_id"] + "/task_id=" + context["task"].task_id + "/**/*" + str(tryNumber - 1) + ".log", recursive=True)[0], "r")

                exception = str(exception)
                stackTrace = str(logs.read())

                headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
                apiUrl = API_URL + '/workflow/job/' + Variable.get(dag_name + "-erl-currentWorkflowJobId") + '/postException'
                payload = {
                    'exception': exception,
                    'stackTrace': stackTrace
                }
                payloadJSON = json.dumps(payload)
                request = requests.put(apiUrl, data=payloadJSON, headers=headers)
                response = request.json()
                try:
                    if request.status_code != 200:
                        raise AirflowException(response)
                except AirflowException as err:
                    raise AirflowException(err)
            except:
                headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
                apiUrl = API_URL + '/workflow/job/' + Variable.get(dag_name + "-erl-currentWorkflowJobId") + '/postException'
                payload = {
                    'exception': 'an error occurred, cannot retrieve log output',
                    'stackTrace': json.dumps(context)
                }
                payloadJSON = json.dumps(payload)
                request = requests.put(apiUrl, data=payloadJSON, headers=headers)
                response = request.json()
                try:
                    if request.status_code != 200:
                        raise AirflowException(response)
                except AirflowException as err:
                    raise AirflowException(err)

        def post_taskend(context):
            print('postTaskEnd ' + context["task_instance"].task_id)
            headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
            apiUrl = API_URL + '/workflow/job/' + Variable.get(dag_name + "-erl-currentWorkflowJobId") + '/postTaskEnd'
            payload = {
                'task': context["task_instance"].task_id,
                'totalTaskNum': Variable.get(dag_name + "-erl-totalTasks-" + context["run_id"])
            }
            payloadJSON = json.dumps(payload)
            request = requests.put(apiUrl, data=payloadJSON, headers=headers)
            response = request.json()
            try:
                if request.status_code != 200:
                    raise AirflowException(response)
            except AirflowException as err:
                raise AirflowException(err)

        @task(on_success_callback=post_taskend, on_failure_callback=post_logs)
        def init_wf(**context):
            headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
            apiUrl = API_URL + '/workflow/jobs'
            payload = {
                'workflowId': dag_name,
                'workflowType': 'ERL'
            }
            payloadJSON = json.dumps(payload)
            request = requests.post(apiUrl, data=payloadJSON, headers=headers)
            response = request.json()
            try:
                if request.status_code != 200:
                    raise AirflowException(response)
                runPlan = set_run_plan(**context)
                Variable.set(dag_name + "-erl-initialCopies-" + context["run_id"], json.dumps(runPlan["initial_copies"]))
                Variable.set(dag_name + "-erl-deltaCopies-" + context["run_id"], json.dumps(runPlan["delta_copies"]))
                Variable.set(dag_name + "-erl-copyStatus-" + context["run_id"], json.dumps(runPlan["copy_status"]))
                totalTasks = tally_dynamic_tasks(runPlan["initial_copies"], runPlan["delta_copies"])
                Variable.set(dag_name + "-erl-totalTasks-" + context["run_id"], totalTasks)
                Variable.set(dag_name + "-erl-currentWorkflowJobId", response["uuid"])
            except AirflowException as err:
                raise AirflowException(err)

        @task(on_failure_callback=post_logs)
        def terminate_wf(**context):
            headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
            apiUrl = API_URL + '/workflow/job/' + Variable.get(dag_name + "-erl-currentWorkflowJobId") + '/postJobEnd'
            request = requests.put(apiUrl, headers=headers)
            response = request.json()
            try:
                if request.status_code != 200:
                    raise AirflowException(response)
            except AirflowException as err: 
                raise AirflowException(err)

        @task(on_success_callback=post_taskend, on_failure_callback=post_logs)
        def clean_dir_request(**context):
            apiUrl = NAS_HOST + "/file/" + dag_name
            request = requests.delete(apiUrl)
            response = request.text
            try:
                if request.status_code != 200:
                    raise AirflowException(response)
            except AirflowException as err:
                raise AirflowException(err)

        @task(on_success_callback=post_taskend, on_failure_callback=post_logs)
        def conditional_primary_key_init(**context):
            connection = get_digital_twin()
            for input in wf_config["inputs"]:
                input_tables = json.loads(Variable.get(dag_name + "-erl-input-tables-" + input["id"] + "-" + context["run_id"], default_var=[]))
                for t in input_tables:
                    schema = t.split('.')[0]
                    table = t.split('.')[1]
                    print("CREATE SOURCE PRIMARY KEY " + table)

                    # get primary key(s)
                    pk_query = connection.execute("SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = '" + table + "'::regclass AND i.indisprimary").fetchall()
                    if len(pk_query):
                        pk_result = pk_query[0]

                        result = connection.execute("SELECT column_name FROM information_schema.columns WHERE table_name ILIKE '" + table + "' AND table_schema ILIKE '" + schema + "' AND column_name = 'source_primary_key'").fetchall()
                        if len(result) == 0:
                            connection.execute("ALTER TABLE \"" + schema + "\".\"" + table + "\" ADD COLUMN source_primary_key " + pk_result["data_type"])
                            connection.execute("CREATE INDEX \"" + table + "_source_primary_key\" ON \"" + schema + "\".\"" + table + "\"(source_primary_key)")
                        result = connection.execute("SELECT * FROM information_schema.columns WHERE table_name ILIKE '" + table + "' AND table_schema ILIKE '" + schema + "' AND column_name ILIKE '" + pk_result["attname"] + "'").fetchone()
                        # create default sequence for primary key column, if necessary
                        if result["column_default"] is None:
                            if pk_result["data_type"] == "uuid":
                                connection.execute("ALTER TABLE \"" + schema + "\".\"" + table + "\" ALTER COLUMN \"" + pk_result["attname"] + "\" SET DEFAULT uuid_generate_v4()")
                            else:
                                connection.execute("CREATE SEQUENCE IF NOT EXISTS \"" + schema + "\".\"" + table + "_pkey_seq\"")
                                connection.execute("ALTER TABLE \"" + schema + "\".\"" + table + "\" ALTER COLUMN \"" + pk_result["attname"] + "\" SET DEFAULT nextval('" + table + "_pkey_seq'::regclass)")
                    else:
                        # create unused source_primary_key column of type int4
                        connection.execute("ALTER TABLE \"" + schema + "\".\"" + table + "\" ADD COLUMN source_primary_key int4")

        @task(on_success_callback=post_taskend, on_failure_callback=post_logs)
        def drop_fk_constraints(input_id, connection, tmp_schema, **context):
            input_tables = json.loads(Variable.get(dag_name + "-erl-input-tables-" + input_id + "-" + context["run_id"], default_var=[]))
            for t in input_tables:
                schema = tmp_schema if tmp_schema else t.split('.')[0]
                table = t.split('.')[1]

                results = connection.execute("SELECT DISTINCT(tc.constraint_name) FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_schema ILIKE '" + schema + "' AND tc.table_name ILIKE '" + table + "'").fetchall()
                if len(results):
                    for constraint in results:
                        connection.execute("ALTER TABLE \"" + schema + "\".\"" + table + "\" DROP CONSTRAINT \"" + constraint["constraint_name"] + "\"")

        # dynamic task mapping functions

        @task(on_failure_callback=post_logs)
        def conditional_extension_init(**context):
            sql = []
            redactics_db_init = db_init()
            if not redactics_db_init:
                # reset DB
                sql = ["DROP EXTENSION IF EXISTS anon CASCADE;CREATE EXTENSION IF NOT EXISTS anon CASCADE;SELECT anon.init();"]
            return sql

        @task(on_failure_callback=post_logs)
        def gen_table_resets(input_id, schema, connection, override_schema, **context):
            tables = []
            initial_copies = json.loads(Variable.get(dag_name + "-erl-initialCopies-" + context["run_id"], default_var=[]))
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for table in initial_copies:
                        tables.append(table)
            if len(tables):
                # fetch extensions to enable
                results = connection.execute("SELECT extname FROM pg_extension").fetchall()
                extensions = []
                if len(results):
                    for extension in results:
                        extensions.append(extension["extname"])

                return [["/scripts/table-resets.sh", dag_name, schema, ",".join(tables), ",".join(extensions), override_schema]]
            else:
                return []
        if digitalTwinEnabled:
            initial_copy_tasks += 1

        @task(on_failure_callback=post_logs)
        def schema_dump_cmds(input_id, **context):
            # initial copy schema dump
            cmds = []
            input_tables = json.loads(Variable.get(dag_name + "-erl-initialCopies-" + context["run_id"], default_var=[]))
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    if len(input_tables):
                        connection = get_source_db(input["id"])
                    for t in input_tables:
                        schema = t.split('.')[0]
                        table = t.split('.')[1]

                        cols = connection.execute("SELECT column_default FROM information_schema.columns WHERE column_default LIKE 'nextval(%%' AND table_name ILIKE '" + table + "' AND table_schema ILIKE '" + schema + "'").fetchall()
                        sequence_tables = []
                        if len(cols):
                            for col in cols:
                                # add schema for dependent sequences
                                sequence_arr = col["column_default"].split("'")
                                sequence_table = sequence_arr[1]
                                sequence_tables.append(schema + "." + table + ":" + sequence_table)
                        cmds.append(["/scripts/schema-dump.sh", dag_name, schema + "." + table, ",".join(sequence_tables)])
            return cmds

        @task(on_failure_callback=post_logs)
        def schema_restore_cmds(input_id, schema, tmp_schema, **context):
            # initial copy schema restore
            cmds = []
            initial_copies = json.loads(Variable.get(dag_name + "-erl-initialCopies-" + context["run_id"], default_var=[]))
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for table in initial_copies:
                        cmds.append(["/scripts/schema-restore.sh", dag_name, schema, table, tmp_schema])
            return cmds
        initial_copy_tasks += 1
        if digitalTwinEnabled:
            initial_copy_tasks += 1

        @task(on_failure_callback=post_logs)
        def data_dump_cmds(input_id, **context):
            # initial copy data dump
            cmds = []
            initial_copies = json.loads(Variable.get(dag_name + "-erl-initialCopies-" + context["run_id"], default_var=[]))
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for table in initial_copies:
                        # only append if table is in full copy list
                        cmd=["/scripts/data-dump.sh", dag_name, table]

                        if table in outputs:
                            options = outputs[table]
                            if options["numDays"] is not None:
                                # calculate date
                                startDate = (datetime.now() + relativedelta(days=-int(options["numDays"]))).isoformat()
                                cmd.extend([startDate, options["sampleFields"], options["createdAtField"], options["updatedAtField"]])
                        cmds.append(cmd)
            return cmds
        initial_copy_tasks += 1        

        @task(on_failure_callback=post_logs)
        def restore_data_cmds(input_id, **context):
            # initial copy data restore
            cmds = []
            initial_copies = json.loads(Variable.get(dag_name + "-erl-initialCopies-" + context["run_id"], default_var=[]))
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for t in initial_copies:
                        table = t.split('.')[1]
                        cmds.append(["/scripts/data-restore.sh", dag_name, table, input_id])
            return cmds
        initial_copy_tasks += 1

        @task(on_failure_callback=post_logs)
        def table_dump_cmds(outputs, input_id, **context):
            cmds = []
            initial_copies = json.loads(Variable.get(dag_name + "-erl-initialCopies-" + context["run_id"], default_var=[]))
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for t in initial_copies:
                        table = t.split('.')[1]
                        cmd=["/scripts/dump-csv-anon-wrapper.sh", dag_name, "\"" + dag_name + "\".\"" + table + "\""]

                        if table in outputs:
                            options = outputs[table]
                            if options["numDays"] is not None:
                                # calculate date
                                startDate = (datetime.now() + relativedelta(days=-int(options["numDays"]))).isoformat()
                                cmd.extend([startDate, options["sampleFields"], options["createdAtField"], options["updatedAtField"]])
                        cmds.append(cmd)
            return cmds
        initial_copy_tasks += 1

        ### delta updates

        @task(on_failure_callback=post_logs)
        def delta_dump_newrow_cmds(input_id, **context):
            # delta data dump - new rows
            cmds = []
            delta_copies = json.loads(Variable.get(dag_name + "-erl-deltaCopies-" + context["run_id"], default_var=[]))
            if len(delta_copies):
                connection = get_redactics_tmp()
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for t in delta_copies:
                        schema = t.split('.')[0]
                        table = t.split('.')[1]
                        tmp_schema = MetaData(schema=dag_name)

                        data = Table(table, tmp_schema, autoload=True, autoload_with=connection)
                        # requires a single primary key
                        primary_key = data.primary_key.columns.values()[0].name
                        results = connection.execute("SELECT \"" + str(primary_key) + "\" FROM \"" + dag_name + "\".\"" + table + "\" WHERE \"" + str(primary_key) + "\" IS NOT NULL ORDER BY \"" + str(primary_key) + "\" DESC LIMIT 1").scalar()
                        primary_key_val = str(results) if results else ""
                        cmds.append(["/scripts/delta-data-dump.sh", dag_name, schema + "." + table, primary_key, primary_key_val, "new"])
            return cmds
        delta_copy_tasks += 1

        @task(on_failure_callback=post_logs)
        def delta_dump_updatedrow_cmds(input_id, **context):
            # delta data dump - updated rows
            cmds = []
            delta_copies = json.loads(Variable.get(dag_name + "-erl-deltaCopies-" + context["run_id"], default_var=[]))
            if len(delta_copies):
                connection = get_redactics_tmp()
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for t in delta_copies:
                        schema = t.split('.')[0]
                        table = t.split('.')[1]

                        results = connection.execute("SELECT \"" + digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"] + "\" FROM \"" + dag_name + "\".\"" + table + "\" WHERE \"" + digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"] + "\" IS NOT NULL ORDER BY \"" + digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"] + "\" DESC LIMIT 1").fetchone()
                        last_updated = str(results[digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"]]) if results and results[digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"]] else ""
                        cmds.append(["/scripts/delta-data-dump.sh", dag_name, schema + "." + table, digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"], last_updated, "updated"])
            return cmds
        delta_copy_tasks += 1

        @task(on_failure_callback=post_logs)
        def delta_restore_cmds(input_id, **context):
            # delta data restore to RedacticsDB
            cmds = []
            delta_copies = json.loads(Variable.get(dag_name + "-erl-deltaCopies-" + context["run_id"], default_var=[])) 
            if len(delta_copies):
                connection = get_redactics_tmp()
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for t in delta_copies:
                        #schema = t.split('.')[0]
                        table = t.split('.')[1]
                        schema = MetaData(schema=dag_name)

                        # get primary key
                        data = Table(table, schema, autoload=True, autoload_with=connection)
                        primary_key = data.primary_key.columns.values()[0].name
                        # get schema info
                        cols = connection.execute("SELECT column_name FROM information_schema.columns WHERE table_name ILIKE '" + table + "' AND table_schema ILIKE '" + dag_name + "' ORDER BY ordinal_position ASC").fetchall()
                        
                        restore_columns = []
                        for c in cols:
                            col = "".join(c)
                            restore_columns.append('"' + col + '"')
                        cmds.append(["/scripts/data-restore-anon.sh", dag_name, "\"" + dag_name + "\".\"" + table + "\"", "1", ",".join(restore_columns), "", primary_key])
            return cmds
        delta_copy_tasks += 1

        @task(on_failure_callback=post_logs)
        def set_security_label_cmds(**context):
            global security_labels
            for rules in wf_config["redactRules"]:
                for t, fields in rules.items():
                    table = t.split('.')[1]

                    for field in fields:
                        for fieldName, params in field.items():
                            if params["rule"] == "redact_email":
                                security_labels.append("ALTER TABLE \"" + dag_name + "\".\"" + table + "\" DROP COLUMN IF EXISTS redacted_email_counter;ALTER TABLE \"" + dag_name + "\".\"" + table + "\" ADD COLUMN redacted_email_counter bigserial;CREATE UNIQUE INDEX \"" + table + "_redacted_email_counter\" ON \"" + dag_name + "\".\"" + table + "\"(redacted_email_counter)") 
                                security_labels.append(redact_email("\"" + dag_name + "\".\"" + table + "\"", "\"" + fieldName + "\"", params=params))
                            elif params["rule"] == "destruction":
                                security_labels.append(destruction("\"" + dag_name + "\".\"" + table + "\"", "\"" + fieldName + "\""))
                            elif params["rule"] == "replacement":
                                security_labels.append(replacement("\"" + dag_name + "\".\"" + table + "\"", "\"" + fieldName + "\"", params=params))
                            elif params["rule"] == "random_string":
                                security_labels.append(random_string("\"" + dag_name + "\".\"" + table + "\"", "\"" + fieldName + "\"", params=params))
            if not security_labels:
                # no-op
                security_labels.append('SELECT 1')
            return security_labels

        ### data feeds

        @task(on_failure_callback=post_logs)
        def gen_dt_table_restore(input_id, **context):
            # full digital twin restore to digital twin DB
            cmds = []
            initial_copies = json.loads(Variable.get(dag_name + "-erl-initialCopies-" + context["run_id"], default_var=[]))
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    if len(initial_copies):
                        connection = get_source_db(input_id)
                    for t in initial_copies:
                        schema = t.split('.')[0]
                        table = t.split('.')[1]
                        public_schema = MetaData(schema=schema)
                        print("GET PRIMARY KEY " + table)

                        awk_print = []
                        # get primary key
                        data = Table(table, public_schema, autoload=True, autoload_with=connection)
                        primary_key = ""
                        if len(data.primary_key.columns.values()):
                            primary_key = data.primary_key.columns.values()[0].name
                        # get schema info
                        cols = connection.execute("SELECT column_name FROM information_schema.columns WHERE table_name ILIKE '" + table + "' AND table_schema ILIKE '" + schema + "' ORDER BY ordinal_position ASC").fetchall()
                        # find primary key index
                        primary_key_idx = 0
                        for idx, c in enumerate(cols):
                            col = "".join(c)
                            if col == primary_key:
                                primary_key_idx = (idx + 1)
                        
                        # build awk print args to output source_primary_key column and discard primary key
                        restore_columns = []
                        for idx, c in enumerate(cols):
                            col = "".join(c)
                            if col != primary_key:
                                awk_print.append("$" + str((idx + 1)))
                                restore_columns.append('"' + col + '"')
                        if primary_key_idx > 0:
                            awk_print.append("$" + str(primary_key_idx))
                        else:
                            awk_print.append("\"\"")
                        restore_columns.append("source_primary_key")
                        cmds.append(["/scripts/data-restore-anon.sh", dag_name, "\"" + dag_name + "\".\"" + table + "\"", "0", ",".join(restore_columns), ",".join(awk_print), "", ""])
            return cmds
        initial_copy_tasks += 1

        @task(on_failure_callback=post_logs)
        def delta_anon_dump_newrow_cmds(input_id, **context):
            # digital twin delta dump
            cmds=[]
            delta_copies = json.loads(Variable.get(dag_name + "-erl-deltaCopies-" + context["run_id"], default_var=[]))
            if len(delta_copies):
                connection = get_digital_twin()
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for t in delta_copies:
                        schema = t.split('.')[0]
                        table = t.split('.')[1]
                        dt_schema = MetaData(schema=schema)

                        # get primary key
                        data = Table(table, dt_schema, autoload=True, autoload_with=connection)
                        primary_key = data.primary_key.columns.values()[0].name
                        results = connection.execute("SELECT source_primary_key FROM \"" + schema + "\".\"" + table + "\" ORDER BY source_primary_key DESC LIMIT 1").scalar()
                        primary_key_val = str(results) if results else ""
                        cmds.append(["/scripts/dump-deltacsv-anon-wrapper.sh", dag_name, "\"" + dag_name + "\".\"" + table + "\"", primary_key, primary_key_val, "new"])
            return cmds
        delta_copy_tasks += 1

        @task(on_failure_callback=post_logs)
        def delta_anon_dump_updatedrow_cmds(input_id, **context):
            # digital twin delta dump
            cmds=[]
            delta_copies = json.loads(Variable.get(dag_name + "-erl-deltaCopies-" + context["run_id"], default_var=[]))
            if len(delta_copies):
                connection = get_digital_twin()
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for t in delta_copies:
                        schema = t.split('.')[0]
                        table = t.split('.')[1]

                        results = connection.execute("SELECT \"" + digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"] + "\" FROM \"" + schema + "\".\"" + table + "\" WHERE \"" + digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"] + "\" IS NOT NULL ORDER BY \"" + digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"] + "\" DESC LIMIT 1").fetchone()
                        last_updated = str(results[digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"]]) if results and results[digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"]] else ""
                        cmds.append(["/scripts/dump-deltacsv-anon-wrapper.sh", dag_name, "\"" + dag_name + "\".\"" + table + "\"", digitalTwinConfig["dataFeedConfig"]["deltaUpdateField"], last_updated, "updated"])
            return cmds
        delta_copy_tasks += 1
        
        @task(on_failure_callback=post_logs)
        def delta_anon_restore_cmds(input_id, **context):
            # digital twin delta restore to digital twin DB
            cmds=[]
            delta_copies = json.loads(Variable.get(dag_name + "-erl-deltaCopies-" + context["run_id"], default_var=[]))
            if len(delta_copies):
                connection = get_digital_twin()
            for input in wf_config["inputs"]:
                if input["id"] == input_id:
                    for t in delta_copies:
                        schema = t.split('.')[0]
                        table = t.split('.')[1]
                        dt_schema = MetaData(schema=schema)

                        awk_print = []
                        # get primary key
                        data = Table(table, dt_schema, autoload=True, autoload_with=connection)
                        primary_key = data.primary_key.columns.values()[0].name
                        # get schema info
                        cols = connection.execute("SELECT column_name FROM information_schema.columns WHERE table_name ILIKE '" + table + "' AND table_schema ILIKE '" + schema + "' ORDER BY ordinal_position ASC").fetchall()
                        # find primary key index
                        primary_key_idx = 0
                        for idx, c in enumerate(cols):
                            col = "".join(c)
                            if col == primary_key:
                                primary_key_idx = (idx + 1)
                        
                        # build awk print args to output source_primary_key column and discard primary key
                        restore_columns = []
                        for idx, c in enumerate(cols):
                            col = "".join(c)
                            if col == "source_primary_key":
                                awk_print.append("$" + str(primary_key_idx))
                                restore_columns.append('"' + col + '"')
                            elif col != primary_key:
                                awk_print.append("$" + str((idx + 1)))
                                restore_columns.append('"' + col + '"')
                        cmds.append(["/scripts/data-restore-anon.sh", dag_name, "\"" + dag_name + "\".\"" + table + "\"", "1", ",".join(restore_columns), ",".join(awk_print), primary_key, "source_primary_key"])
            return cmds
        delta_copy_tasks += 1

        @task(on_failure_callback=post_logs)
        def get_prepared_statements(**context):
            cmds = []
            if DIGITAL_TWIN_PREPARED_STATEMENTS is not None:
                rawPreparedStatements = DIGITAL_TWIN_PREPARED_STATEMENTS.split(';')
                preparedStatements = [x for x in rawPreparedStatements if x.strip()]
                cmds.append(preparedStatements)
            return cmds
           
        ### define task steps

        init_workflow = init_wf()
        totalTasks += 1

        init_pg_anon = PostgresOperator.partial(
            task_id='init-pg-anonymizer-extension',
            postgres_conn_id='redacticsDB',
            database='redactics_tmp',
            on_failure_callback=post_logs,
            on_success_callback=post_taskend,
            ).expand(
                sql=conditional_extension_init()
            )
        
        clean_dir = clean_dir_request()
        totalTasks += 1

        init_custom_functions = PostgresOperator(
            task_id='init-custom-functions',
            postgres_conn_id='redacticsDB',
            database='redactics_tmp',
            sql=CUSTOM_FUNCTIONS,
            autocommit=True,
            on_failure_callback=post_logs,
            on_success_callback=post_taskend,
            trigger_rule='none_failed'
            )
        totalTasks += 1

        clean_dir.set_upstream(init_workflow)
        init_pg_anon.set_upstream(init_workflow)
        init_custom_functions.set_upstream([clean_dir, init_pg_anon])

        input_idx = 0
        for input in wf_config["inputs"]:
            extra = json.loads(BaseHook.get_connection(input["id"]).extra) if BaseHook.get_connection(input["id"]).extra else ""
            k8s_pg_source_envvars = {
                "PGHOST": BaseHook.get_connection(input["id"]).host,
                "PGUSER": BaseHook.get_connection(input["id"]).login,
                "PGPASSWORD": BaseHook.get_connection(input["id"]).password,
                "PGDATABASE": BaseHook.get_connection(input["id"]).schema,
                "CONNECTION": "source"
            }
            if extra:
                if "sslmode" in extra:
                    k8s_pg_source_envvars["PGSSLMODE"] = extra["sslmode"]
                if "sslrootcert" in extra:
                    k8s_pg_source_envvars["PGSSLROOTCERT"] = extra["sslrootcert"]
                    secrets.append(Secret('volume', "/pgcerts-secrets/" + input["id"], "pgcert-" + input["id"]))
                if "sslcert" in extra:
                    # optional
                    k8s_pg_source_envvars["PGSSLCERT"] = extra["sslcert"]
                if "sslkey" in extra:
                    # optional
                    k8s_pg_source_envvars["PGSSLKEY"] = extra["sslkey"]
        
            ### full copy tasks

            schema_dump = KubernetesPodOperator.partial(
                task_id="schema-dump-" + str(input_idx),
                namespace=NAMESPACE,
                image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                image_pull_policy="Always",
                get_logs=True,
                env_vars=k8s_pg_source_envvars,
                secrets=secrets,
                affinity=affinity,
                # resources = client.V1ResourceRequirements(
                #     requests={"memory": "256Mi"}
                # ),
                name="agent-pg-schemadump",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend,
                ).expand(
                    cmds=schema_dump_cmds(input["id"])
                )
            schema_dump.set_upstream([init_custom_functions])

            table_resets = KubernetesPodOperator.partial(
                task_id="table-resets-" + str(input_idx),
                namespace=NAMESPACE,
                image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                image_pull_policy="Always",
                get_logs=True,
                env_vars=k8s_pg_tmp_envvars,
                secrets=secrets,
                affinity=affinity,
                # resources = {
                #     "request_memory": "256Mi"
                # },
                name="agent-pg-tableresets",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend,
                ).expand(
                    cmds=gen_table_resets(input["id"], "{}".format(BaseHook.get_connection("redacticsDB").schema), get_source_db(input["id"]), dag_name)
                )
            table_resets.set_upstream(schema_dump)

            schema_restore = KubernetesPodOperator.partial(
                task_id="schema-restore-" + str(input_idx),
                namespace=NAMESPACE,
                image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                image_pull_policy="Always",
                get_logs=True,
                env_vars=k8s_pg_tmp_envvars,
                secrets=secrets,
                affinity=affinity,
                # resources = {
                #     "request_memory": "256Mi"
                # },
                name="agent-pg-schemarestore",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend,
                ).expand(
                    cmds=schema_restore_cmds(input["id"], "{}".format(BaseHook.get_connection("redacticsDB").schema), "1")
                )
            schema_restore.set_upstream(table_resets)

            trigger_drop_fk_contraints = drop_fk_constraints(input["id"], get_redactics_tmp(), dag_name)
            totalTasks += 1
            trigger_drop_fk_contraints.set_upstream(schema_restore)

            data_dump = KubernetesPodOperator.partial(
                task_id="data-dump-" + str(input_idx),
                namespace=NAMESPACE,
                image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                image_pull_policy="Always",
                get_logs=True,
                env_vars=k8s_pg_source_envvars,
                secrets=secrets,
                affinity=affinity,
                # resources = {
                #     "request_memory": "256Mi"
                # },
                name="agent-pg-datadump",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend,
                max_active_tis_per_dag=1
                ).expand(
                    cmds=data_dump_cmds(input["id"])
                )
            data_dump.set_upstream(trigger_drop_fk_contraints)

            restore_data = KubernetesPodOperator.partial(
                task_id="restore-data-" + str(input_idx),
                namespace=NAMESPACE,
                image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                image_pull_policy="Always",
                get_logs=True,
                env_vars=k8s_pg_tmp_envvars,
                secrets=secrets,
                affinity=affinity,
                # resources = {
                #     "request_memory": "256Mi"
                # },
                name="agent-restore-data",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend,
                ).expand(
                    cmds=restore_data_cmds(input["id"])
                )
            restore_data.set_upstream(data_dump)

            ### delta copy tasks

            delta_dump_newrow = KubernetesPodOperator.partial(
                task_id="delta-dump-new-" + str(input_idx),
                namespace=NAMESPACE,
                image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                image_pull_policy="Always",
                get_logs=True,
                env_vars=k8s_pg_source_envvars,
                secrets=secrets,
                affinity=affinity,
                # resources = {
                #     "request_memory": "256Mi"
                # },
                name="agent-pg-deltadump-new",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend
                ).expand(
                    cmds=delta_dump_newrow_cmds(input["id"])
                )
            delta_dump_newrow.set_upstream([init_custom_functions])

            delta_dump_updatedrow = KubernetesPodOperator.partial(
                task_id="delta-dump-updated-" + str(input_idx),
                namespace=NAMESPACE,
                image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                image_pull_policy="Always",
                get_logs=True,
                env_vars=k8s_pg_source_envvars,
                secrets=secrets,
                affinity=affinity,
                # resources = {
                #     "request_memory": "256Mi"
                # },
                name="agent-pg-deltadump-updated",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend
                ).expand(
                    cmds=delta_dump_updatedrow_cmds(input["id"])
                )
            delta_dump_updatedrow.set_upstream([init_custom_functions])

            delta_restore = KubernetesPodOperator.partial(
                task_id="delta-restore-" + str(input_idx),
                namespace=NAMESPACE,
                image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                image_pull_policy="Always",
                get_logs=True,
                env_vars=k8s_pg_tmp_envvars,
                secrets=secrets,
                affinity=affinity,
                # resources = {
                #     "request_memory": "256Mi"
                # },
                name="agent-pg-deltarestore",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend
                ).expand(
                    cmds=delta_restore_cmds(input["id"])
                )
            delta_restore.set_upstream([delta_dump_newrow, delta_dump_updatedrow])

            apply_security_labels = PostgresOperator.partial(
                task_id='apply-security-labels',
                postgres_conn_id='redacticsDB',
                database='redactics_tmp',
                on_failure_callback=post_logs,
                on_success_callback=post_taskend,
                trigger_rule='none_failed'
                ).expand(
                    sql=set_security_label_cmds()
                )
            apply_security_labels.set_upstream([restore_data, delta_restore])

            table_dumps = KubernetesPodOperator.partial(
                task_id="dump-tables",
                namespace=NAMESPACE,
                image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                image_pull_policy="Always",
                get_logs=True,
                env_vars=k8s_pg_tmp_envvars,
                secrets=secrets,
                affinity=affinity,
                # resources = {
                #     "request_memory": "256Mi"
                # },
                name="agent-dump-tables",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend,
                #trigger_rule='all_done'
                ).expand(
                    cmds=table_dump_cmds(outputs, input["id"])
                )
            table_dumps.set_upstream(apply_security_labels)

            if digitalTwinEnabled:
                input_idx = 0
                for input in wf_config["inputs"]:
                    dfSecrets = []

                    k8s_pg_twin_envvars = {
                        "PGHOST": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).host,
                        "PGUSER": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).login,
                        "PGPASSWORD": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).password,
                        "PGDATABASE": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).schema,
                        "CONNECTION": "digital-twin"
                    }
                    twin_extra = json.loads(BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).extra) if BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).extra else ""
                    if twin_extra:
                        if "sslmode" in twin_extra:
                            k8s_pg_twin_envvars["PGSSLMODE"] = twin_extra["sslmode"]
                        if "sslrootcert" in twin_extra:
                            k8s_pg_twin_envvars["PGSSLROOTCERT"] = twin_extra["sslrootcert"]
                            dfSecrets.append(Secret('volume', "/pgcerts-secrets/" + digitalTwinConfig["dataFeedConfig"]["inputSource"], "pgcert-" + digitalTwinConfig["dataFeedConfig"]["inputSource"]))
                        if "sslcert" in twin_extra:
                            # optional
                            k8s_pg_twin_envvars["PGSSLCERT"] = twin_extra["sslcert"]
                        if "sslkey" in extra:
                            # optional
                            k8s_pg_twin_envvars["PGSSLKEY"] = twin_extra["sslkey"]

                    dt_delta_dump_newrow = KubernetesPodOperator.partial(
                        task_id="delta-data-dump-digitaltwin-new-" + str(input_idx),
                        namespace=NAMESPACE,
                        image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                        image_pull_policy="Always",
                        get_logs=True,
                        env_vars=k8s_pg_tmp_envvars,
                        secrets=dfSecrets,
                        affinity=affinity,
                        # resources = {
                        #     "request_memory": "256Mi"
                        # },
                        name="agent-pg-deltadump-digitaltwin-new",
                        is_delete_operator_pod=is_delete_operator_pod,
                        in_cluster=True,
                        hostnetwork=False,
                        on_failure_callback=post_logs,
                        on_success_callback=post_taskend
                        ).expand(
                            cmds=delta_anon_dump_newrow_cmds(input["id"])
                        )
                    dt_delta_dump_newrow.set_upstream([delta_restore, apply_security_labels])

                    dt_delta_dump_updatedrow = KubernetesPodOperator.partial(
                        task_id="delta-data-dump-digitaltwin-updated-" + str(input_idx),
                        namespace=NAMESPACE,
                        image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                        image_pull_policy="Always",
                        get_logs=True,
                        env_vars=k8s_pg_tmp_envvars,
                        secrets=dfSecrets,
                        affinity=affinity,
                        # resources = {
                        #     "request_memory": "256Mi"
                        # },
                        name="agent-pg-deltadump-digitaltwin-updated",
                        is_delete_operator_pod=is_delete_operator_pod,
                        in_cluster=True,
                        hostnetwork=False,
                        on_failure_callback=post_logs,
                        on_success_callback=post_taskend
                        ).expand(
                            cmds=delta_anon_dump_updatedrow_cmds(input["id"])
                        )
                    dt_delta_dump_updatedrow.set_upstream([delta_restore, apply_security_labels])

                    dt_delta_restore = KubernetesPodOperator.partial(
                        task_id="delta-data-restore-digitaltwin-" + str(input_idx),
                        namespace=NAMESPACE,
                        image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                        image_pull_policy="Always",
                        get_logs=True,
                        env_vars=k8s_pg_twin_envvars,
                        secrets=dfSecrets,
                        affinity=affinity,
                        # resources = {
                        #     "request_memory": "256Mi"
                        # },
                        name="agent-pg-deltarestore-digitaltwin",
                        is_delete_operator_pod=is_delete_operator_pod,
                        in_cluster=True,
                        hostnetwork=False,
                        on_failure_callback=post_logs,
                        on_success_callback=post_taskend
                        ).expand(
                            cmds=delta_anon_restore_cmds(input["id"])
                        )
                    dt_delta_restore.set_upstream([dt_delta_dump_newrow, dt_delta_dump_updatedrow])
                    input_idx += 1
            else:
                dt_delta_restore = DummyOperator(task_id="dt-delta-restore-noop", on_success_callback=post_taskend)
                dt_delta_restore.set_upstream(delta_restore)
                totalTasks += 1

        ### full copy data feeds

        if s3UploadEnabled:
            dfSecrets = []

            for secret in s3UploadConfig["feedSecrets"]:
                if secret["secretType"] == "volume":
                    dfSecrets.append(Secret('volume', secret["secretPath"], secret["secretName"], secret["secretKey"]))
                elif secret["secretType"] == "env":
                    dfSecrets.append(Secret('env', secret["envName"], secret["secretName"], secret["secretKey"]))

            s3Upload = KubernetesPodOperator(
                task_id="data-feed-s3upload",
                namespace=NAMESPACE,
                image=s3UploadConfig["dataFeedConfig"]["image"] + ":" + s3UploadConfig["dataFeedConfig"]["tag"],
                image_pull_policy="Always",
                cmds=[s3UploadConfig["dataFeedConfig"]["shell"], "-c"] + [s3UploadConfig["dataFeedConfig"]["command"]] if s3UploadConfig["dataFeedConfig"]["command"] else None,
                arguments=[s3UploadConfig["dataFeedConfig"]["args"]] if s3UploadConfig["dataFeedConfig"]["args"] else None,
                secrets=dfSecrets,
                get_logs=True,
                affinity=affinity,
                name="agent-data-feed-s3upload",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend
                )
        else:
            s3Upload = DummyOperator(task_id="s3upload-noop", on_success_callback=post_taskend)
        totalTasks += 1
        s3Upload.set_upstream(table_dumps)

        if customEnabled:
            dfSecrets = []

            for secret in customConfig["feedSecrets"]:
                if secret["secretType"] == "volume":
                    dfSecrets.append(Secret('volume', secret["secretPath"], secret["secretName"], secret["secretKey"]))
                elif secret["secretType"] == "env":
                    dfSecrets.append(Secret('env', secret["envName"], secret["secretName"], secret["secretKey"]))

            custom = KubernetesPodOperator(
                task_id="data-feed-custom",
                namespace=NAMESPACE,
                image=customConfig["dataFeedConfig"]["image"] + ":" + customConfig["dataFeedConfig"]["tag"],
                image_pull_policy="Always",
                cmds=[customConfig["dataFeedConfig"]["shell"], "-c"] + [customConfig["dataFeedConfig"]["command"]] if customConfig["dataFeedConfig"]["command"] else None,
                arguments=[customConfig["dataFeedConfig"]["args"]] if customConfig["dataFeedConfig"]["args"] else None,
                secrets=dfSecrets,
                get_logs=True,
                affinity=affinity,
                name="agent-data-feed-custom",
                is_delete_operator_pod=is_delete_operator_pod,
                in_cluster=True,
                hostnetwork=False,
                on_failure_callback=post_logs,
                on_success_callback=post_taskend,
                trigger_rule='none_failed'
                )
            custom.set_upstream(table_dumps)
        else:
            custom = DummyOperator(task_id="custom-noop", trigger_rule='none_failed', on_success_callback=post_taskend)
        totalTasks += 1
        custom.set_upstream([delta_restore, table_dumps])

        if digitalTwinEnabled:
            input_idx = 0
            for input in wf_config["inputs"]:
                dfSecrets = []

                k8s_pg_twin_envvars = {
                    "PGHOST": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).host,
                    "PGUSER": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).login,
                    "PGPASSWORD": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).password,
                    "PGDATABASE": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).schema,
                    "CONNECTION": "digital-twin"
                }
                twin_extra = json.loads(BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).extra) if BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).extra else ""
                if twin_extra:
                    if "sslmode" in twin_extra:
                        k8s_pg_twin_envvars["PGSSLMODE"] = twin_extra["sslmode"]
                    if "sslrootcert" in twin_extra:
                        k8s_pg_twin_envvars["PGSSLROOTCERT"] = twin_extra["sslrootcert"]
                        dfSecrets.append(Secret('volume', "/pgcerts-secrets/" + digitalTwinConfig["dataFeedConfig"]["inputSource"], "pgcert-" + digitalTwinConfig["dataFeedConfig"]["inputSource"]))
                    if "sslcert" in twin_extra:
                        # optional
                        k8s_pg_twin_envvars["PGSSLCERT"] = twin_extra["sslcert"]
                    if "sslkey" in extra:
                        # optional
                        k8s_pg_twin_envvars["PGSSLKEY"] = twin_extra["sslkey"]

                dt_table_resets = KubernetesPodOperator.partial(
                    task_id="table-resets-dt-" + str(input_idx),
                    namespace=NAMESPACE,
                    image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                    image_pull_policy="Always",
                    get_logs=True,
                    env_vars=k8s_pg_twin_envvars,
                    secrets=dfSecrets,
                    affinity=affinity,
                    # resources = {
                    #     "request_memory": "256Mi"
                    # },
                    name="agent-pg-tableresets-dt",
                    is_delete_operator_pod=is_delete_operator_pod,
                    in_cluster=True,
                    hostnetwork=False,
                    on_failure_callback=post_logs,
                    on_success_callback=post_taskend,
                    ).expand(
                        cmds=gen_table_resets(input["id"], "{}".format(BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).schema), get_source_db(input["id"]), "")
                    )
                dt_table_resets.set_upstream(table_dumps)

                dt_schema_restore = KubernetesPodOperator.partial(
                    task_id="schema-restore-digitaltwin-" + str(input_idx),
                    namespace=NAMESPACE,
                    image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                    image_pull_policy="Always",
                    get_logs=True,
                    env_vars=k8s_pg_twin_envvars,
                    secrets=dfSecrets,
                    affinity=affinity,
                    # resources = {
                    #     "request_memory": "256Mi"
                    # },
                    name="agent-pg-schemarestore-digitaltwin",
                    is_delete_operator_pod=is_delete_operator_pod,
                    in_cluster=True,
                    hostnetwork=False,
                    on_failure_callback=post_logs,
                    on_success_callback=post_taskend
                    ).expand(
                        cmds=schema_restore_cmds(input["id"], "{}".format(BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).schema), "")
                    )
                dt_schema_restore.set_upstream(dt_table_resets)

                trigger_drop_fk_contraints_dt = drop_fk_constraints(input["id"], get_digital_twin(), "")
                totalTasks += 1
                trigger_drop_fk_contraints_dt.set_upstream(dt_schema_restore)

                primary_key_schema = conditional_primary_key_init()
                totalTasks += 1
                primary_key_schema.set_upstream(dt_schema_restore)

                dt_data_restore = KubernetesPodOperator.partial(
                    task_id="restore-data-digitaltwin-" + str(input_idx),
                    namespace=NAMESPACE,
                    image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                    image_pull_policy="Always",
                    get_logs=True,
                    env_vars=k8s_pg_twin_envvars,
                    secrets=dfSecrets,
                    affinity=affinity,
                    # resources = {
                    #     "request_memory": "256Mi"
                    # },
                    name="agent-restore-data-digitaltwin",
                    is_delete_operator_pod=is_delete_operator_pod,
                    in_cluster=True,
                    hostnetwork=False,
                    on_failure_callback=post_logs,
                    on_success_callback=post_taskend,
                    ).expand(
                        cmds=gen_dt_table_restore(input["id"])
                    )
                dt_data_restore.set_upstream([trigger_drop_fk_contraints_dt, primary_key_schema])
                input_idx += 1
        else:
            dt_data_restore = DummyOperator(task_id="dt-noop", on_success_callback=post_taskend)
            totalTasks += 1
            dt_data_restore.set_upstream([delta_restore, table_dumps])
        
        ### end data feeds

        if digitalTwinEnabled and digitalTwinConfig["dataFeedConfig"]["enablePostUpdatePreparedStatements"]:
            apply_prepared_statements = PostgresOperator.partial(
                task_id='apply-prepared-statements',
                postgres_conn_id=digitalTwinConfig["dataFeedConfig"]["inputSource"],
                database=BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).schema,
                parameters=digitalTwinConfig["dataFeedConfig"]["postUpdateKeyValues"],
                on_failure_callback=post_logs,
                on_success_callback=post_taskend,
                trigger_rule='none_failed'
                ).expand(
                    sql=get_prepared_statements()
                )
            apply_prepared_statements.set_upstream([s3Upload, custom, dt_data_restore, dt_delta_restore])
            totalTasks += 1
        else:
            apply_prepared_statements = DummyOperator(task_id="apply-prepared-statements-noop", on_success_callback=post_taskend, trigger_rule='none_failed')
            apply_prepared_statements.set_upstream([s3Upload, custom, dt_data_restore, dt_delta_restore])
            totalTasks += 1

        terminate_workflow = terminate_wf()
        terminate_workflow.set_upstream(apply_prepared_statements)
    
    init_redactics_workflow = redactics_workflow()

except AirflowException as err:
    raise AirflowException(err)