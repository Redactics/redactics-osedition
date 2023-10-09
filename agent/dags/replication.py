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
UDF_VERSION = 36
TABLE_SCHEMA_VERSION = 3

dag_name = os.path.basename(__file__).split('.')[0]

ENV = os.environ['ENV']
API_URL = os.environ['API_URL']
REGISTRY_URL = "redactics"

installedUDFVersion = Variable.get(dag_name + '-installedUDFVersion', default_var=0)
tableSchemaVersion = Variable.get(dag_name + '-tableSchemaVersion', default_var=0)

def get_landing_db(landing_db):
    host = BaseHook.get_connection("redacticsDB").host
    login = BaseHook.get_connection("redacticsDB").login
    password = BaseHook.get_connection("redacticsDB").password
    extra = json.loads(BaseHook.get_connection("redacticsDB").extra) if BaseHook.get_connection("redacticsDB").extra else ""

    try:
        connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                            .format(login=login, password=password,
                                    host=host, schema=landing_db), connect_args=extra, echo=False)
        connection.connect()
    except OperationalError:
        # landing DB has not been created yet, create landing DB
        connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                            .format(login=login, password=password,
                                    host=host, schema="postgres"), connect_args=extra, echo=False)
        connection.execution_options(isolation_level="AUTOCOMMIT").execute("CREATE DATABASE " + landing_db)

    connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                            .format(login=login, password=password,
                                    host=host, schema=landing_db), connect_args=extra, echo=False)
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
            # apiUrl = API_URL + '/workflow/' + Variable.get(dag_name + "-piiscanner-currentWorkflowJobId") + '/postException'
            # payload = {
            #     'exception': 'an error occurred, cannot retrieve log output',
            #     'stackTrace': ''
            # }
            # payloadJSON = json.dumps(payload)
            # request = requests.put(apiUrl, data=payloadJSON, headers=headers)
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
        redactics_tmp = None
        if int(installedUDFVersion) != UDF_VERSION:
            # update UDFs
            print("UPDATING UDFS")
            
            # get landing database (workflow) name
            apiUrl = API_URL + '/workflow/' + dag_name
            request = requests.get(apiUrl)
            wf_config = request.json()
            print(wf_config)
            landing_db = wf_config["name"].lower().replace(" ", "")

            with get_landing_db(landing_db).connect() as con:
                with open("/opt/airflow/dags/replication-functions.sql") as file:
                    query = text(file.read())
                    con.execution_options(isolation_level="AUTOCOMMIT").execute(query)

            Variable.set(dag_name + '-installedUDFVersion', UDF_VERSION)
            Variable.set(dag_name + '-landingDB', landing_db)
        else:
            landing_db = Variable.get(dag_name + '-landingDB')

        if int(tableSchemaVersion) == 0:
            # preload anon into future sessions
            redactics_tmp = get_landing_db(Variable.get(dag_name + '-landingDB'))
            redactics_tmp.execution_options(isolation_level="AUTOCOMMIT").execute("ALTER DATABASE %(database)s SET session_preload_libraries = 'anon'", {
                'database': AsIs(landing_db)
            })
        
        if int(tableSchemaVersion) != TABLE_SCHEMA_VERSION:
            # update table schema
            print("UPDATING TABLE SCHEMA")

            redactics_tmp = get_landing_db(landing_db)
            with redactics_tmp.connect() as con:
                with open("/opt/airflow/dags/replication-schema-1.sql") as file:
                    query = text(file.read())
                    con.execution_options(isolation_level="AUTOCOMMIT").execute(query)
            
            if int(tableSchemaVersion) == 0:
                print("INIT ANON EXTENSION")
                redactics_tmp.execution_options(isolation_level="AUTOCOMMIT").execute("CREATE EXTENSION anon CASCADE")
                redactics_tmp.execution_options(isolation_level="AUTOCOMMIT").execute("SELECT anon.init()")

            Variable.set(dag_name + '-tableSchemaVersion', TABLE_SCHEMA_VERSION)

        # check on Redactics role
        if "LANDING_USERS" in os.environ:
            if not redactics_tmp:
                redactics_tmp = get_landing_db(landing_db)
            landing_users = json.loads(os.environ['LANDING_USERS'])
            for user in landing_users:
                landing_db_user = user["user"]
                landing_db_pass = user["password"]
                check_landing_user = redactics_tmp.execute("SELECT * FROM pg_roles WHERE rolname = %(username)s", {
                    'username': landing_db_user
                }).fetchone()
                if not check_landing_user:
                    print("CREATE LANDING DB USER " + landing_db_user)
                    redactics_tmp.execution_options(isolation_level="AUTOCOMMIT").execute("CREATE ROLE %(username)s WITH LOGIN PASSWORD %(password)s", {
                        'username': AsIs(landing_db_user),
                        'password': landing_db_pass
                    })
                    # create record of landing db user so that grants can be issued on new schema creation
                    check_landing_user = redactics_tmp.execute("SELECT * FROM redactics_landingdb_users WHERE username = %(username)s", {
                        'username': landing_db_user
                    }).fetchone()
                    if not check_landing_user:
                        redactics_tmp.execute("INSERT INTO redactics_landingdb_users (username) VALUES (%(username)s)", {
                            'username': landing_db_user
                        })

    @task(on_failure_callback=post_logs)
    def update_redaction_rules(**context):
        print("UPDATING REDACT RULES")
        apiUrl = API_URL + '/workflow/' + dag_name
        request = requests.get(apiUrl)
        wf_config = request.json()
        print(wf_config)
        redact_rules = wf_config["redactRules"]
        for rule in redact_rules:
            last_updated = parser.parse(Variable.get(dag_name + '-lastUpdatedRedactRules', default_var='')) if Variable.get(dag_name + '-lastUpdatedRedactRules', default_var='') else ''
            if not last_updated or (rule["updatedAt"] and parser.parse(rule["updatedAt"]) > last_updated):
                # upsert to table
                landing_db = Variable.get(dag_name + '-landingDB')
                redactics_tmp = get_landing_db(landing_db)
                rule_check = redactics_tmp.execute("SELECT * FROM redactics_masking_rules WHERE schema = %(schema)s AND table_name = %(table_name)s AND column_name = %(column_name)s", {
                    'schema': rule["schema"],
                    'table_name': rule["table"],
                    'column_name': rule["column"]
                }).fetchone()
                updated_at = datetime.now(timezone.utc).isoformat()
                if not rule_check:
                    # insert
                    print("INSERT MASKING RULE")
                    redactics_tmp.execute("INSERT INTO redactics_masking_rules (schema, table_name, column_name, rule, redact_data, updated_at) VALUES (%(schema)s, %(table_name)s, %(column_name)s, %(rule)s, %(redact_data)s, %(updated_at)s)", {
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
                    redactics_tmp.execute("UPDATE redactics_masking_rules SET rule = %(rule)s, redact_data = %(redact_data)s, updated_at = %(updated_at)s WHERE schema = %(schema)s AND table_name = %(table_name)s AND column_name = %(column_name)s", {
                        'schema': rule["schema"],
                        'table_name': rule["table"],
                        'column_name': rule["column"],
                        'rule': rule["rule"],
                        'redact_data': json.dumps(rule["redactData"]),
                        'updated_at': updated_at
                    })
                # don't apply masking rules if the schema/table hasn't been created yet
                table_check = redactics_tmp.execute("SELECT 1 FROM pg_tables WHERE schemaname = %(schema)s AND tablename = %(table_name)s", {
                    'schema': rule["schema"],
                    'table_name': rule["table"]
                }).fetchone()
                if table_check:
                    print("APPLY MASKING RULES")
                    redactics_tmp.execution_options(isolation_level="AUTOCOMMIT").execute("SELECT set_redactions(%(schema)s, %(table_name)s)", {
                        'schema': rule["schema"],
                        'table_name': rule["table"]
                    })
                    Variable.set(dag_name + '-lastUpdatedRedactRules', updated_at)

    landing_db_step = init_landing_db()
    update_redaction_rules_step = update_redaction_rules()
    update_redaction_rules_step.set_upstream(landing_db_step)

start_replication = replication()