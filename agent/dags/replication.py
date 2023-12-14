from datetime import timedelta, datetime, timezone, date
from dateutil import parser
from urllib.parse import urlparse
from psycopg2.extensions import AsIs
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
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
from airflow.models import Variable


# version bumping will result in reinstall of UDFs
UDF_VERSION = 38
TABLE_SCHEMA_VERSION = 3

dag_name = os.path.basename(__file__).split('.')[0]

ENV = os.environ['ENV']
API_URL = os.environ['API_URL']
REGISTRY_URL = "redactics"

installedUDFVersion = Variable.get(dag_name + '-installedUDFVersion', default_var=0)
tableSchemaVersion = Variable.get(dag_name + '-tableSchemaVersion', default_var=0)

def get_landing_db_name(wf_config):
    # returns landing/target DB name
    return wf_config["name"].lower().replace(" ", "")

def get_landing_db_id(wf_config):
    # returns landing/target DB UUID
    landing_db = ""
    for input in wf_config["inputs"]:
        if input["inputFunction"] == "target":
            landing_db = input["uuid"]
    return landing_db

def get_landing_db_conn(landing_db_conn_id, landing_db_name):
    # returns landing/target DB connection
    host = BaseHook.get_connection(landing_db_conn_id).host
    login = BaseHook.get_connection(landing_db_conn_id).login
    password = BaseHook.get_connection(landing_db_conn_id).password
    extra = json.loads(BaseHook.get_connection(landing_db_conn_id).extra) if BaseHook.get_connection(landing_db_conn_id).extra else ""

    try:
        connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                            .format(login=login, password=password,
                                    host=host, schema=landing_db_name), connect_args=extra, echo=False)
        connection.connect()
    except OperationalError:
        # landing DB has not been created yet, create landing DB
        connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                            .format(login=login, password=password,
                                    host=host, schema="postgres"), connect_args=extra, echo=False)
        connection.execution_options(isolation_level="AUTOCOMMIT").execute("CREATE DATABASE " + landing_db_name)

    connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                            .format(login=login, password=password,
                                    host=host, schema=landing_db_name), connect_args=extra, echo=False)
    return connection

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

@dag(
    dag_id=dag_name,
    default_args=default_args,
    schedule_interval="*/1 * * * *" if ENV == "development" else "*/5 * * * *",
    start_date=airflow.utils.dates.days_ago(1),
    catchup=False,
)

def replication():

    def post_logs(context):
        try:
            tryNumber = context["task_instance"].try_number
            exception = context["exception"]

            logs = open(glob.glob("/opt/airflow/logs/dag_id=" + context["dag"].dag_id + "/run_id=" + context["run_id"] + "/task_id=" + context["task"].task_id + "/**/*" + str(tryNumber - 1) + ".log", recursive=True)[0], "r")

            exception = str(exception)
            stackTrace = str(logs.read())

            # TODO: API endpoint to receive stack trace
            print("TRACE", stackTrace)
        except:
            # headers = {'Content-type': 'application/json', 'Accept': 'text/plain', 'x-api-key': API_KEY}
            # api_url = API_URL + '/workflow/' + Variable.get(dag_name + "-piiscanner-currentWorkflowJobId") + '/postException'
            # payload = {
            #     'exception': 'an error occurred, cannot retrieve log output',
            #     'stackTrace': ''
            # }
            # payloadJSON = json.dumps(payload)
            # request = requests.put(api_url, data=payloadJSON, headers=headers)
            # response = request.json()
            # try:
            #     if request.status_code != 200:
            #         raise AirflowException(response)
            # except AirflowException as err:
            #     raise AirflowException(err)

            # TODO: API endpoint to receive stack trace
            print("TRACE")

    @task(on_failure_callback=post_logs)
    def init_landing_db(**context):
        if int(installedUDFVersion) != UDF_VERSION:
            # update UDFs
            print("UPDATING UDFS")
            
            # get landing database (workflow) name
            api_url = API_URL + '/workflow/' + dag_name
            request = requests.get(api_url)
            wf_config = request.json()
            print(wf_config)
            landing_db_name = get_landing_db_name(wf_config)
            landing_db_conn_id = get_landing_db_id(wf_config)
            print("LANDING DB CONN ID")
            print(landing_db_conn_id)
            print("LANDING DB NAME")
            print(landing_db_name)
            landing_db_conn = get_landing_db_conn(landing_db_conn_id, landing_db_name)

            with landing_db_conn.connect() as con:
                with open("/opt/airflow/dags/replication-functions.sql") as file:
                    query = text(file.read())
                    con.execution_options(isolation_level="AUTOCOMMIT").execute(query)

            Variable.set(dag_name + '-installedUDFVersion', UDF_VERSION)
            Variable.set(dag_name + '-landingDBName', landing_db_name)
            Variable.set(dag_name + '-landingDBConnID', landing_db_conn_id)
        else:
            landing_db_conn_id = Variable.get(dag_name + '-landingDBConnID')
            landing_db_name = Variable.get(dag_name + '-landingDBName')
            print("LANDING DB CONN ID")
            print(landing_db_conn_id)
            print("LANDING DB NAME")
            print(landing_db_name)
            landing_db_conn = get_landing_db_conn(landing_db_conn_id, landing_db_name)

        if int(tableSchemaVersion) == 0:
            # preload anon into future sessions
            landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("ALTER DATABASE %(database)s SET session_preload_libraries = 'anon'", {
                'database': AsIs(landing_db_name)
            })
        
        if int(tableSchemaVersion) != TABLE_SCHEMA_VERSION:
            # update table schema
            print("UPDATING TABLE SCHEMA")

            with landing_db_conn.connect() as con:
                with open("/opt/airflow/dags/replication-schema-1.sql") as file:
                    query = text(file.read())
                    con.execution_options(isolation_level="AUTOCOMMIT").execute(query)
            
            if int(tableSchemaVersion) == 0:
                print("INIT ANON EXTENSION")
                landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("CREATE EXTENSION anon CASCADE")
                landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("SELECT anon.init()")

            Variable.set(dag_name + '-tableSchemaVersion', TABLE_SCHEMA_VERSION)

        # check on Redactics role
        if "LANDING_USERS" in os.environ:
            landing_users = json.loads(os.environ['LANDING_USERS'])
            for user in landing_users:
                landing_db_user = user["user"]
                landing_db_pass = user["password"]
                check_landing_user = landing_db_conn.execute("SELECT * FROM pg_roles WHERE rolname = %(username)s", {
                    'username': landing_db_user
                }).fetchone()
                if not check_landing_user:
                    print("CREATE LANDING DB USER " + landing_db_user)
                    landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("CREATE ROLE %(username)s WITH LOGIN PASSWORD %(password)s", {
                        'username': AsIs(landing_db_user),
                        'password': landing_db_pass
                    })
                    # create record of landing db user so that grants can be issued on new schema creation
                    check_landing_user = landing_db_conn.execute("SELECT * FROM redactics_landingdb_users WHERE username = %(username)s", {
                        'username': landing_db_user
                    }).fetchone()
                    if not check_landing_user:
                        landing_db_conn.execute("INSERT INTO redactics_landingdb_users (username) VALUES (%(username)s)", {
                            'username': landing_db_user
                        })

    @task(on_failure_callback=post_logs)
    def update_redaction_rules(**context):
        print("UPDATING REDACT RULES")
        landing_db_conn = None
        api_url = API_URL + '/workflow/' + dag_name
        request = requests.get(api_url)
        wf_config = request.json()
        print(wf_config)
        redact_rules = wf_config["redactRules"]
        ddl_trigger_init = Variable.get(dag_name + '-ddlTriggerInit', default_var=False)
        if len(redact_rules) and not ddl_trigger_init:
            print("APPLY DDL TRIGGERS")
            landing_db_name = get_landing_db_name(wf_config)
            landing_db_conn_id = get_landing_db_id(wf_config)
            landing_db_conn = get_landing_db_conn(landing_db_conn_id, landing_db_name)
            
            landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("DROP EVENT TRIGGER IF EXISTS ddl_trigger")
            landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("CREATE EVENT TRIGGER ddl_trigger ON ddl_command_end EXECUTE FUNCTION ddl_trigger_func()")
            Variable.set(dag_name + '-ddlTriggerInit', True)
        for rule in redact_rules:
            if not landing_db_conn:
                landing_db_name = get_landing_db_name(wf_config)
                landing_db_conn_id = get_landing_db_id(wf_config)
                landing_db_conn = get_landing_db_conn(landing_db_conn_id, landing_db_name)

            last_updated = parser.parse(Variable.get(dag_name + '-lastUpdatedRedactRules', default_var='')) if Variable.get(dag_name + '-lastUpdatedRedactRules', default_var='') else ''
            if not last_updated or (rule["updatedAt"] and parser.parse(rule["updatedAt"]) > last_updated):
                # upsert to table
                rule_check = landing_db_conn.execute("SELECT * FROM redactics_masking_rules WHERE schema = %(schema)s AND table_name = %(table_name)s AND column_name = %(column_name)s", {
                    'schema': rule["schema"],
                    'table_name': rule["table"],
                    'column_name': rule["column"]
                }).fetchone()
                updated_at = datetime.now(timezone.utc).isoformat()
                if not rule_check:
                    # insert
                    print("INSERT MASKING RULE")
                    landing_db_conn.execute("INSERT INTO redactics_masking_rules (schema, table_name, column_name, rule, redact_data, updated_at) VALUES (%(schema)s, %(table_name)s, %(column_name)s, %(rule)s, %(redact_data)s, %(updated_at)s)", {
                        'schema': rule["schema"],
                        'table_name': rule["table"],
                        'column_name': rule["column"],
                        'rule': rule["rule"],
                        'redact_data': json.dumps(rule["redactData"]),
                        'updated_at': updated_at
                    })
                else:
                    # update
                    print("UPDATE MASKING RULE")
                    landing_db_conn.execute("UPDATE redactics_masking_rules SET rule = %(rule)s, redact_data = %(redact_data)s, updated_at = %(updated_at)s WHERE schema = %(schema)s AND table_name = %(table_name)s AND column_name = %(column_name)s", {
                        'schema': rule["schema"],
                        'table_name': rule["table"],
                        'column_name': rule["column"],
                        'rule': rule["rule"],
                        'redact_data': json.dumps(rule["redactData"]),
                        'updated_at': updated_at
                    })
                # don't apply masking rules if the schema/table hasn't been created yet
                table_check = landing_db_conn.execute("SELECT 1 FROM pg_tables WHERE schemaname = %(schema)s AND tablename = %(table_name)s", {
                    'schema': rule["schema"],
                    'table_name': rule["table"]
                }).fetchone()
                if table_check:
                    print("APPLY MASKING RULES")
                    landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("SELECT set_redactions(%(schema)s, %(table_name)s)", {
                        'schema': rule["schema"],
                        'table_name': rule["table"]
                    })
                    Variable.set(dag_name + '-lastUpdatedRedactRules', updated_at)

    landing_db_step = init_landing_db()
    update_redaction_rules_step = update_redaction_rules()
    update_redaction_rules_step.set_upstream(landing_db_step)

start_replication = replication()