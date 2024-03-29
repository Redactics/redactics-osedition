from datetime import timedelta
from datetime import datetime
from urllib.parse import urlparse
from airflow.decorators import dag, task
from sqlalchemy import create_engine, select, func, Table, Column, MetaData, and_

import glob
import airflow
import json
import os
import requests
from airflow import DAG
from airflow import AirflowException
from airflow.hooks.base_hook import BaseHook
from airflow.operators.postgres_operator import PostgresOperator
from airflow.providers.cncf.kubernetes.operators.kubernetes_pod import KubernetesPodOperator
from airflow.kubernetes.secret import Secret

dag_file = os.path.basename(__file__).split('.')[0]
dag_name = dag_file.replace('-migrationmocking','')
NAMESPACE = os.environ['NAMESPACE']
ENV = os.environ['ENV']
API_URL = os.environ['API_URL']
REGISTRY_URL = "redactics"
AGENT_VERSION = os.environ['AGENT_VERSION']
PG_CLIENT_VERSION = "15"

NODESELECTOR = os.environ['NODESELECTOR']
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

is_delete_operator_pod = False if ENV == "development" else True
secrets = []

headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
apiUrl = API_URL + '/workflow/' + dag_name
request = requests.get(apiUrl, headers=headers)
wf_config = request.json()
input = wf_config["inputs"][0]
input_id = wf_config["inputs"][0]["uuid"]
database = wf_config["migrationDatabase"]
clone_database = wf_config["migrationDatabaseClone"]

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

def set_exclude_tables(input):
    source_db = get_source_db(input["uuid"])
    # collect tables from workflow config, supporting wildcards
    found_tables = []
    append_sql = []
    schema_sql = "table_schema LIKE 'pg_%%' OR table_schema = 'information_schema'"
    table_sql = ""
    for t in input["tables"]:
        schema = t.split('.')[0]
        table = t.split('.')[1]

        if "*" in schema:
            schema = schema.replace("*", "%%")
        if "*" in table:
            table = table.replace("*", "%%")
        sql = "(table_schema ILIKE '" + schema + "' AND "
        sql += "table_name ILIKE '" + table + "')"
        append_sql.append(sql)

    idx=0
    for sql in append_sql:
        if (idx + 1) < len(append_sql):
            table_sql += append_sql[idx] + " OR "
        else:
            table_sql += append_sql[idx]
        idx+=1
    
    if table_sql:
        print("SELECT * FROM information_schema.columns WHERE " + schema_sql + " OR " + table_sql)
        tables = source_db.execute("SELECT * FROM information_schema.columns WHERE " + schema_sql + " OR " + table_sql).fetchall()
    else:
        print("SELECT * FROM information_schema.columns WHERE " + schema_sql)
        tables = source_db.execute("SELECT * FROM information_schema.columns WHERE " + schema_sql).fetchall()
    if len(tables):
        for idx, t in enumerate(tables):
                found_tables.append(t["table_schema"] + "." + t["table_name"])
        
    print("FOUND TABLES")
    print(list(dict.fromkeys(found_tables)))
    return list(dict.fromkeys(found_tables))

k8s_pg_source_envvars = {
    "PGHOST": BaseHook.get_connection(input_id).host,
    "PGUSER": BaseHook.get_connection(input_id).login,
    "PGPASSWORD": BaseHook.get_connection(input_id).password,
    "PGDATABASE": BaseHook.get_connection(input_id).schema
}

extra = json.loads(BaseHook.get_connection(input_id).extra) if BaseHook.get_connection(input_id).extra else ""
if extra:
    if "sslmode" in extra:
        k8s_pg_source_envvars["PGSSLMODE"] = extra["sslmode"]
    if "sslrootcert" in extra:
        secrets = [Secret('volume', "/pgcerts-secrets/" + input_id, "pgcert-" + input_id)]
        k8s_pg_source_envvars["PGSSLROOTCERT"] = extra["sslrootcert"]
    if "sslcert" in extra:
        # optional
        k8s_pg_source_envvars["PGSSLCERT"] = extra["sslcert"]
    if "sslkey" in extra:
        # optional
        k8s_pg_source_envvars["PGSSLKEY"] = extra["sslkey"]

default_args = {
    #'depends_on_past': False,
    'retries': 0,
    'retry_delay': timedelta(minutes=2),
    'email_on_failure': False
    # 'queue': 'bash_queue',
    # 'pool': 'backfill',
    # 'priority_weight': 10,
    # 'end_date': datetime(2016, 1, 1),
}

# set max_active_runs to 1 to prevent concurrency
@dag(
    dag_id=dag_name + '-migrationmocking',
    default_args=default_args,
    description='Redactics DB Migration Mocking',
    start_date=airflow.utils.dates.days_ago(1),
    schedule_interval=None,
    catchup=False,
    max_active_runs=1
)
def db_migration_mocking():

    def post_logs(context):
        try:
            tryNumber = context["task_instance"].try_number
            exception = context["exception"]

            logs = open(glob.glob("/opt/airflow/logs/dag_id=" + context["dag"].dag_id + "/run_id=" + context["run_id"] + "/task_id=" + context["task"].task_id + "/**/*" + str(tryNumber - 1) + ".log", recursive=True)[0], "r")

            exception = str(exception)
            stackTrace = str(logs.read())

            headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
            apiUrl = API_URL + '/workflow/job/' + context["params"]["workflowJobId"] + '/postException'
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
            apiUrl = API_URL + '/workflow/job/' + context["params"]["workflowJobId"] + '/postException'
            payload = {
                'exception': 'an error occurred, cannot retrieve log output',
                'stackTrace': ''
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
        headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
        apiUrl = API_URL + '/workflow/job/' + context["params"]["workflowJobId"] + '/postTaskEnd'
        payload = {
            'task': context["task_instance"].task_id,
            'totalTaskNum': 3
        }
        payloadJSON = json.dumps(payload)
        request = requests.put(apiUrl, data=payloadJSON, headers=headers)
        response = json.loads(request.text)
        try:
            if request.status_code != 200:
                raise AirflowException(response)
        except AirflowException as err:
            raise AirflowException(err)

    @task(on_failure_callback=post_logs)
    def terminate_wf(**context):
        headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
        apiUrl = API_URL + '/workflow/job/' + context["params"]["workflowJobId"] + '/postJobEnd'
        request = requests.put(apiUrl, headers=headers)
        response = request.json()
        try:
            if request.status_code != 200:
                raise AirflowException(response)
        except AirflowException as err: 
            raise AirflowException(err)

    @task(on_failure_callback=post_logs)
    def set_clone_cmd(**context):
        cmds=[]
        exclude_tables = set_exclude_tables(input)
        cmds.append(["/scripts/clone-db.sh", database, clone_database, ",".join(exclude_tables)])
        return cmds

    # drop database with force requires PG 13
    #return ["DROP DATABASE IF EXISTS redactics_clone WITH (FORCE)"]
    drop_clone = PostgresOperator(
        task_id='drop-clone',
        autocommit=True,
        postgres_conn_id=input_id,
        database=database,
        sql=[
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '" + clone_database + "'",
            "DROP DATABASE IF EXISTS " + clone_database
        ],
        on_failure_callback=post_logs,
        on_success_callback=post_taskend
        )

    create_db = PostgresOperator(
        task_id='create-db',
        autocommit=True,
        postgres_conn_id=input_id,
        database=database,
        sql=["CREATE DATABASE " + clone_database + " OWNER " + BaseHook.get_connection(input_id).login],
        on_failure_callback=post_logs,
        on_success_callback=post_taskend
        )
    create_db.set_upstream(drop_clone)

    clone_db = KubernetesPodOperator.partial(
        task_id="clone-db",
        namespace=NAMESPACE,
        image=REGISTRY_URL + "/postgres-client:" + PG_CLIENT_VERSION + "-" + AGENT_VERSION,
        # ensure latest PG image is cached
        image_pull_policy="Always",
        get_logs=True,
        affinity=affinity,
        env_vars=k8s_pg_source_envvars,
        secrets=secrets,
        # resources = client.V1ResourceRequirements(
        #     requests={"memory": "256Mi"}
        # ),
        image_pull_secrets="redactics-registry",
        name="redactics-clone-db",
        is_delete_operator_pod=is_delete_operator_pod,
        in_cluster=True,
        hostnetwork=False,
        on_failure_callback=post_logs,
        on_success_callback=post_taskend,
        ).expand(
            cmds=set_clone_cmd()
        )
    clone_db.set_upstream(create_db)

    terminate_workflow = terminate_wf()
    terminate_workflow.set_upstream(clone_db)

db_migration = db_migration_mocking()