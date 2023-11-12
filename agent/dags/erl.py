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

cf_file = open("/opt/airflow/dags/erl-functions.sql", "r")
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
DIGITAL_TWIN_PREPARED_STATEMENTS = os.environ['DIGITAL_TWIN_PREPARED_STATEMENTS'] if "DIGITAL_TWIN_PREPARED_STATEMENTS" in os.environ else None
PG_CLIENT_VERSION = "15"

is_delete_operator_pod = False if ENV == "development" else True
secrets = []

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
    'retries': 5 if ENV == "development" else 30,
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
dataFeeds = []

if wf_config.get("export") and len(wf_config["export"]):
    for output in wf_config["export"]:
        for table, options in output.items():
            outputs[table] = options

digitalTwinEnabled = False
digitalTwinConfig = {}
s3UploadEnabled = False
s3UploadConfig = {}
customEnabled = False
customConfig = {}

# init data feed vars
if wf_config.get("dataFeeds") and len(wf_config.get("dataFeeds")):
    for feed in wf_config.get("dataFeeds"):
        if feed["dataFeed"] == "digitalTwin":
            digitalTwinEnabled = True
            digitalTwinConfig = feed
        elif feed["dataFeed"] == "s3upload":
            s3UploadEnabled = True
            s3UploadConfig = feed
        elif feed["dataFeed"] == "custom":
            customEnabled = True
            customConfig = feed

def get_db(input_id):
    host = BaseHook.get_connection(input_id).host
    login = BaseHook.get_connection(input_id).login
    password = BaseHook.get_connection(input_id).password
    schema = BaseHook.get_connection(input_id).schema
    extra = json.loads(BaseHook.get_connection(input_id).extra) if BaseHook.get_connection(input_id).extra else ""

    connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                            .format(login=login, password=password,
                                    host=host, schema=schema), connect_args=extra, echo=False)
    return connection

def transformation_enabled():
    init_anon = False
    for input in wf_config["inputs"]:
        if input["inputFunction"] == "transformation":
            init_anon = True
    return init_anon

def get_transformation_db():
    for input in wf_config["inputs"]:
        if input["inputFunction"] == "transformation":
            return get_db(input["uuid"])
        
def get_target_db():
    if transformation_enabled():
        return "redacticsDB"
    else:
        for input in wf_config["inputs"]:
            if input["inputFunction"] == "target":
                return input["uuid"]
        
target_db = get_target_db()
k8s_pg_targetdb_envvars = {
    "PGHOST": BaseHook.get_connection(target_db).host,
    "PGUSER": BaseHook.get_connection(target_db).login,
    "PGPASSWORD": BaseHook.get_connection(target_db).password,
    "PGDATABASE": BaseHook.get_connection(target_db).schema,
    "API_URL": API_URL,
    "CONNECTION": target_db
}

def db_init():
    # check that extension has been inited
    if not transformation_enabled():
        return False
    connection = get_transformation_db()
    results = connection.execute("SELECT oid FROM pg_extension WHERE extname='anon'").scalar()
    return False if results is None else True

redactics_db_init = db_init()
totalTasks = 0
copyTasks = 0

def set_input_tables(input, source_db, context):
    # collect tables from workflow config, supporting wildcards
    found_tables = []
    append_sql = []
    schema_sql = "table_schema NOT LIKE 'pg_%%' AND table_schema != 'information_schema'"
    table_sql = ""
    views = []
    tables = []
    # build list of view definitions to exclude from table listings
    views_query = source_db.execute("SELECT table_schema, table_name FROM information_schema.views WHERE table_schema NOT LIKE 'pg_%%' AND table_schema != 'information_schema' AND view_definition IS NOT NULL").fetchall()
    if len(views_query):
        for idx, v in enumerate(views_query):
            views.append(v["table_schema"] + "." + v["table_name"])
    print("FOUND VIEWS")
    print(list(dict.fromkeys(views)))

    if input["tableSelection"] == "all":
        tables = source_db.execute("SELECT table_schema, table_name FROM information_schema.columns WHERE table_schema NOT LIKE 'pg_%%' AND table_schema != 'information_schema'").fetchall()
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

        print("SELECT table_schema, table_name FROM information_schema.columns WHERE " + schema_sql + " AND " + table_sql)
        tables = source_db.execute("SELECT table_schema, table_name FROM information_schema.columns WHERE " + schema_sql + " AND " + table_sql).fetchall()
    if len(tables):
        for idx, t in enumerate(tables):
                if (t["table_schema"] + "." + t["table_name"]) not in views:
                    found_tables.append(t["table_schema"] + "." + t["table_name"])
    print("FOUND TABLES")
    print(list(dict.fromkeys(found_tables)))
    Variable.set(dag_name + "-erl-input-tables-" + input["uuid"] + "-" + context["run_id"], json.dumps(list(dict.fromkeys(found_tables))))
    return list(dict.fromkeys(found_tables))

def tally_dynamic_tasks(table_copies):
    global totalTasks
    global copyTasks
    if transformation_enabled() and not db_init():
        # extension init
        totalTasks += 1
    # dynamic tasks based on the number of initial copies
    totalTasks += len(table_copies) * copyTasks
    totalTasks += len(security_labels)
        
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
        global copyTasks

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
                #runPlan = set_run_plan(**context)
                totalTasks = 0
                for input in wf_config["inputs"]:
                    tableListing = set_input_tables(input, get_db(input["uuid"]), context)
                    print("TABLE LISTING")
                    print(tableListing)
                    Variable.set(dag_name + "-erl-tableListing-" + context["run_id"], json.dumps(tableListing))
                totalTasks = totalTasks + tally_dynamic_tasks(tableListing)
                Variable.set(dag_name + "-erl-totalTasks-" + context["run_id"], totalTasks)
                Variable.set(dag_name + "-erl-currentWorkflowJobId", response["uuid"])
            except AirflowException as err:
                raise AirflowException(err)

        @task(on_failure_callback=post_logs, trigger_rule='none_failed')
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
                if request.status_code != 200 and response != "Not Found":
                    raise AirflowException(response)
            except AirflowException as err:
                raise AirflowException(err)

        @task(on_success_callback=post_taskend, on_failure_callback=post_logs, trigger_rule='none_failed')
        def init_unique_email_generator(connection, **context):
            for rules in wf_config["indexedRedactRules"]:
                for t, fields in rules.items():
                    table = t.split('.')[1]

                    for field in fields:
                        for fieldName, params in field.items():
                            if params["rule"] == "redact_email":
                                # create redacted email counter field, if necessary
                                email_counter_field = connection.execute("SELECT * FROM information_schema.columns WHERE table_schema ILIKE '" + dag_name + "' AND table_name ILIKE '" + table + "' AND column_name = 'redacted_email_counter'").fetchone()
                                if not email_counter_field:
                                    print("ALTER TABLE \"" + dag_name + "\".\"" + table + "\" ADD COLUMN redacted_email_counter bigserial")
                                    altertable = connection.execute("ALTER TABLE \"" + dag_name + "\".\"" + table + "\" ADD COLUMN redacted_email_counter bigserial")
                                    connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS \"" + table + "_redacted_email_counter\" ON \"" + dag_name + "\".\"" + table + "\"(redacted_email_counter)")

        # dynamic task mapping functions

        @task(on_failure_callback=post_logs)
        def gen_table_resets(input_id, schema, connection, **context):
            tables = []
            input_tables = json.loads(Variable.get(dag_name + "-erl-tableListing-" + context["run_id"]))
            extensions_schema = ""
            for input in wf_config["inputs"]:
                if input["uuid"] == input_id:
                    extensions_schema = input["extensionsSchema"]
                    for table in input_tables:
                        tables.append(table)
            if len(tables) and connection:
                # fetch extensions to enable
                results = connection.execute("SELECT extname FROM pg_extension").fetchall()
                extensions = []
                if len(results):
                    for extension in results:
                        extensions.append(extension["extname"])
                    if "plpgsql" not in extensions:
                        # add anon extension requirement
                        extensions.append("plpgsql")

                return [["/scripts/table-resets.sh", dag_name, schema, input_id, ",".join(tables), ",".join(extensions), extensions_schema]]
            else:
                return []

        @task(on_failure_callback=post_logs)
        def schema_dump_cmds(input_id, **context):
            # initial copy schema dump
            cmds = []
            unique_schema = []
            input_tables = json.loads(Variable.get(dag_name + "-erl-tableListing-" + context["run_id"]))
            for input in wf_config["inputs"]:
                if input["uuid"] == input_id:
                    for t in input_tables:
                        schema = t.split('.')[0]
                        if schema not in unique_schema:
                            unique_schema.append(schema)
                            cmds.append(["/scripts/schema-dump.sh", dag_name, schema])                    
            return cmds

        @task(on_failure_callback=post_logs)
        def schema_restore_cmds(input_id, target_database, **context):
            # initial copy schema restore
            cmds = []
            unique_schema = []
            input_tables = json.loads(Variable.get(dag_name + "-erl-tableListing-" + context["run_id"]))
            for input in wf_config["inputs"]:
                if input["uuid"] == input_id:
                    for t in input_tables:
                        schema = t.split('.')[0]
                        if schema not in unique_schema:
                            unique_schema.append(schema)
                            cmds.append(["/scripts/schema-restore.sh", dag_name, target_database, schema])
            return cmds

        @task(on_failure_callback=post_logs)
        def data_dump_cmds(input_id, **context):
            # initial copy data dump
            cmds = []
            input_tables = json.loads(Variable.get(dag_name + "-erl-tableListing-" + context["run_id"]))
            for input in wf_config["inputs"]:
                if input["uuid"] == input_id:
                    for table in input_tables:
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

        @task(on_failure_callback=post_logs)
        def restore_data_cmds(input_id, **context):
            cmds = []
            input_tables = json.loads(Variable.get(dag_name + "-erl-tableListing-" + context["run_id"]))
            for input in wf_config["inputs"]:
                if input["uuid"] == input_id:
                    for t in input_tables:
                        schema = t.split('.')[0]
                        table = t.split('.')[1]
                        cmds.append(["/scripts/data-restore.sh", dag_name, "\"" + schema + "\".\"" + table + "\"", input_id])
            return cmds
    
        @task(on_failure_callback=post_logs)
        def generate_constraints_cmd(input_id, **context):
            cmds = []
            for input in wf_config["inputs"]:
                if input["uuid"] == input_id:
                    cmds.append(["/scripts/generate-constraints-sql.sh", dag_name, input_id])
            return cmds
        
        @task(on_failure_callback=post_logs)
        def restore_fk_constraints_cmd(input_id, **context):
            cmds = []
            for input in wf_config["inputs"]:
                if input["uuid"] == input_id:
                    cmds.append(["/scripts/restore-fk-constraints.sh", dag_name, input_id])
            return cmds

        @task(on_failure_callback=post_logs)
        def table_dump_cmds(outputs, input_id, **context):
            cmds = []
            input_tables = json.loads(Variable.get(dag_name + "-erl-tableListing-" + context["run_id"]))
            for input in wf_config["inputs"]:
                if input["uuid"] == input_id:
                    for t in input_tables:
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

        @task(on_failure_callback=post_logs)
        def set_security_label_cmds(**context):
            global security_labels
            if not transformation_enabled():
                return []
            for rules in wf_config["indexedRedactRules"]:
                for t, fields in rules.items():
                    table = t.split('.')[1]

                    for field in fields:
                        for fieldName, params in field.items():
                            if params["rule"] == "redact_email":
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
            table_copies = json.loads(Variable.get(dag_name + "-erl-tableCopies-" + context["run_id"]))
            if len(table_copies):
                connection = get_db(input_id)
            for input in wf_config["inputs"]:
                if input["uuid"] == input_id:
                    for t in table_copies:
                        schema = t.split('.')[0]
                        table = t.split('.')[1]
                       
                        cmds.append(["/scripts/data-restore-anon.sh", dag_name, "\"" + dag_name + "\".\"" + table + "\""])
            return cmds

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
        init_custom_functions.set_upstream(init_workflow)

        input_idx = 0
        for input in wf_config["inputs"]:
            if input["inputFunction"] == "source":
                extra = json.loads(BaseHook.get_connection(input["uuid"]).extra) if BaseHook.get_connection(input["uuid"]).extra else ""
                k8s_pg_source_envvars = {
                    "PGHOST": BaseHook.get_connection(input["uuid"]).host,
                    "PGUSER": BaseHook.get_connection(input["uuid"]).login,
                    "PGPASSWORD": BaseHook.get_connection(input["uuid"]).password,
                    "PGDATABASE": BaseHook.get_connection(input["uuid"]).schema,
                    "CONNECTION": "source"
                }
                if extra:
                    if "sslmode" in extra:
                        k8s_pg_source_envvars["PGSSLMODE"] = extra["sslmode"]
                    if "sslrootcert" in extra:
                        k8s_pg_source_envvars["PGSSLROOTCERT"] = extra["sslrootcert"]
                        secrets.append(Secret('volume', "/pgcerts-secrets/" + input["uuid"], "pgcert-" + input["uuid"]))
                    if "sslcert" in extra:
                        # optional
                        k8s_pg_source_envvars["PGSSLCERT"] = extra["sslcert"]
                    if "sslkey" in extra:
                        # optional
                        k8s_pg_source_envvars["PGSSLKEY"] = extra["sslkey"]
            
                ### full copy tasks

                generate_constraints_sql = KubernetesPodOperator.partial(
                    task_id="generate-constraints-sql-" + str(input_idx),
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
                    name="generate-constraint-sql",
                    is_delete_operator_pod=is_delete_operator_pod,
                    in_cluster=True,
                    hostnetwork=False,
                    on_failure_callback=post_logs,
                    on_success_callback=post_taskend,
                    ).expand(
                        cmds=generate_constraints_cmd(input["uuid"])
                    )
                generate_constraints_sql.set_upstream([init_custom_functions, clean_dir])
                totalTasks += 1

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
                        cmds=schema_dump_cmds(input["uuid"])
                    )
                schema_dump.set_upstream(generate_constraints_sql)
                totalTasks += 1

                table_resets = KubernetesPodOperator.partial(
                    task_id="table-resets-" + str(input_idx),
                    namespace=NAMESPACE,
                    image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                    get_logs=True,
                    env_vars=k8s_pg_targetdb_envvars,
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
                        cmds=gen_table_resets(input["uuid"], "{}".format(BaseHook.get_connection(target_db).schema), get_db(target_db))
                    )
                table_resets.set_upstream(schema_dump)
                totalTasks += 1

                schema_restore = KubernetesPodOperator.partial(
                    task_id="schema-restore-" + str(input_idx),
                    namespace=NAMESPACE,
                    image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                    get_logs=True,
                    env_vars=k8s_pg_targetdb_envvars,
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
                        cmds=schema_restore_cmds(input["uuid"], "{}".format(BaseHook.get_connection(target_db).schema))
                    )
                schema_restore.set_upstream(table_resets)
                totalTasks += 1

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
                    #max_active_tis_per_dag=1
                    ).expand(
                        cmds=data_dump_cmds(input["uuid"])
                    )
                data_dump.set_upstream(schema_restore)
                copyTasks += 1

                restore_data = KubernetesPodOperator.partial(
                    task_id="restore-data-" + str(input_idx),
                    namespace=NAMESPACE,
                    image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                    image_pull_policy="Always",
                    get_logs=True,
                    env_vars=k8s_pg_targetdb_envvars,
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
                        cmds=restore_data_cmds(input["uuid"])
                    )
                restore_data.set_upstream(data_dump)
                copyTasks += 1

                restore_fk_constraints = KubernetesPodOperator.partial(
                    task_id="restore-fk-constraints-" + str(input_idx),
                    namespace=NAMESPACE,
                    image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                    image_pull_policy="Always",
                    get_logs=True,
                    env_vars=k8s_pg_targetdb_envvars,
                    secrets=secrets,
                    affinity=affinity,
                    # resources = {
                    #     "request_memory": "256Mi"
                    # },
                    name="restore-fk-constraints",
                    is_delete_operator_pod=is_delete_operator_pod,
                    in_cluster=True,
                    hostnetwork=False,
                    on_failure_callback=post_logs,
                    on_success_callback=post_taskend,
                    ).expand(
                        cmds=restore_fk_constraints_cmd(input["uuid"])
                    )
                restore_fk_constraints.set_upstream(restore_data)
                totalTasks += 1

        ### data feeds

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
        s3Upload.set_upstream(restore_fk_constraints)

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
            custom.set_upstream(restore_fk_constraints)
        else:
            custom = DummyOperator(task_id="custom-noop", trigger_rule='none_failed', on_success_callback=post_taskend)
        totalTasks += 1
        custom.set_upstream(restore_fk_constraints)

        if digitalTwinEnabled:
            input_idx = 0
            for input in wf_config["inputs"]:
                if input["inputFunction"] == "source":
                    dfSecrets = []

                    k8s_pg_twin_envvars = {
                        "PGHOST": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).host,
                        "PGUSER": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).login,
                        "PGPASSWORD": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).password,
                        "PGDATABASE": BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).schema,
                        "API_URL": API_URL,
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

                    unique_email_generator = init_unique_email_generator(get_transformation_db())
                    unique_email_generator.set_upstream(restore_fk_constraints)
                    totalTasks += 1

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
                    apply_security_labels.set_upstream(unique_email_generator)

                    table_dumps = KubernetesPodOperator.partial(
                        task_id="dump-tables",
                        namespace=NAMESPACE,
                        image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                        image_pull_policy="Always",
                        get_logs=True,
                        env_vars=k8s_pg_targetdb_envvars,
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
                            cmds=table_dump_cmds(outputs, input["uuid"])
                        )
                    table_dumps.set_upstream(apply_security_labels)
                    copyTasks += 1
                    input_idx += 1

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
                            cmds=gen_table_resets(input["uuid"], "{}".format(BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).schema), get_db(target_db))
                        )
                    dt_table_resets.set_upstream(table_dumps)
                    totalTasks += 1

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
                            cmds=schema_restore_cmds(input["uuid"], "{}".format(BaseHook.get_connection(digitalTwinConfig["dataFeedConfig"]["inputSource"]).schema))
                        )
                    dt_schema_restore.set_upstream(dt_table_resets)

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
                            cmds=gen_dt_table_restore(input["uuid"])
                        )
                    dt_data_restore.set_upstream(dt_schema_restore)
                    copyTasks += 1

                    dt_restore_fk_constraints = KubernetesPodOperator.partial(
                        task_id="dt-restore-fk-constraints-" + str(input_idx),
                        namespace=NAMESPACE,
                        image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
                        image_pull_policy="Always",
                        get_logs=True,
                        env_vars=k8s_pg_twin_envvars,
                        secrets=secrets,
                        affinity=affinity,
                        # resources = {
                        #     "request_memory": "256Mi"
                        # },
                        name="dt-restore-fk-constraints",
                        is_delete_operator_pod=is_delete_operator_pod,
                        in_cluster=True,
                        hostnetwork=False,
                        on_failure_callback=post_logs,
                        on_success_callback=post_taskend,
                        ).expand(
                            cmds=restore_fk_constraints_cmd(input["uuid"])
                        )
                    dt_restore_fk_constraints.set_upstream(dt_data_restore)
                    totalTasks += 1

                    if digitalTwinConfig["dataFeedConfig"]["enablePostUpdatePreparedStatements"]:
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
                        apply_prepared_statements.set_upstream([s3Upload, custom, dt_restore_fk_constraints])
                        totalTasks += 1
                    else:
                        apply_prepared_statements = DummyOperator(task_id="apply-prepared-statements-noop", on_success_callback=post_taskend, trigger_rule='none_failed')
                        apply_prepared_statements.set_upstream([s3Upload, custom, dt_restore_fk_constraints])
                        totalTasks += 1
                    
                    input_idx += 1
        else:
            apply_prepared_statements = DummyOperator(task_id="dt-noop", on_success_callback=post_taskend)
            totalTasks += 1
            apply_prepared_statements.set_upstream(restore_fk_constraints)
        
        ### end data feeds

        terminate_workflow = terminate_wf()
        terminate_workflow.set_upstream(apply_prepared_statements)
    
    init_redactics_workflow = redactics_workflow()

except AirflowException as err:
    raise AirflowException(err)