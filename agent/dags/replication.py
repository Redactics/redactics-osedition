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
import google.cloud.dlp
from google.oauth2 import service_account
from airflow import DAG
from airflow import AirflowException
from airflow.hooks.base_hook import BaseHook
from airflow.models import Variable


# version bumping will result in reinstall of UDFs
UDF_VERSION = 38
TABLE_SCHEMA_VERSION = 4

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
        if "LANDING_USERS" in os.environ and os.environ['LANDING_USERS'] != "null":
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
        landing_db_conn = None
        api_url = API_URL + '/workflow/' + dag_name
        request = requests.get(api_url)
        wf_config = request.json()
        # TODO: make this dynamic
        wf_config["dlpEnabled"] = True
        print(wf_config)
        redact_rules = wf_config["redactRules"]
        landing_db_name = get_landing_db_name(wf_config)
        landing_db_conn_id = get_landing_db_id(wf_config)
        landing_db_conn = get_landing_db_conn(landing_db_conn_id, landing_db_name)
        toggle_dlp = False
        if wf_config["dlpEnabled"] and str(wf_config["dlpEnabled"]) != Variable.get(dag_name + '-dlpEnabled', default_var=False):
            # enable DLP
            print("ENABLE DLP TRIGGERS")
            landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("DROP EVENT TRIGGER IF EXISTS ddl_trigger")
            landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("DROP EVENT TRIGGER IF EXISTS ddl_dlp_trigger")
            landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("CREATE EVENT TRIGGER ddl_dlp_trigger ON ddl_command_end EXECUTE FUNCTION ddl_dlp_trigger_func()")
            Variable.set(dag_name + '-dlpEnabled', True)
            # mark redaction rules for reset
            Variable.delete(dag_name + '-lastUpdatedRedactRules')
            toggle_dlp = True
        elif not wf_config["dlpEnabled"] and str(wf_config["dlpEnabled"]) != Variable.get(dag_name + '-dlpEnabled', default_var=False):
            # disable DLP
            print("DISABLE DLP TRIGGERS")
            landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("DROP EVENT TRIGGER IF EXISTS ddl_trigger")
            landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("DROP EVENT TRIGGER IF EXISTS ddl_dlp_trigger")
            landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("CREATE EVENT TRIGGER ddl_trigger ON ddl_command_end EXECUTE FUNCTION ddl_trigger_func()")
            Variable.set(dag_name + '-dlpEnabled', False)
            # mark redaction rules for reset
            Variable.delete(dag_name + '-lastUpdatedRedactRules')
            toggle_dlp = True

        # gather scan action decisions and update ruleset
        scan_actions = landing_db_conn.execute("SELECT id, schema, table_name, primary_key, primary_key_name, primary_key_type, scan_action, scan_result FROM public.redactics_quarantine_results WHERE scan_action IS NOT NULL").fetchall()
        unquarantine = {}
        quarantine_ids = []
        for q in scan_actions:
            if q["scan_action"] == "ignore":
                # API call to redact rules
                # add to local ruleset
                print("ignore")
            elif q["scan_action"] == "accept":
                # API call to redact rules
                # add to local ruleset
                print("accept")

            if (q["schema"] + "." + q["table_name"]) not in unquarantine:
                unquarantine[q["schema"] + "." + q["table_name"]] = {}
            if "primaryKeys" not in (q["schema"] + "." + q["table_name"]):
                unquarantine[q["schema"] + "." + q["table_name"]]["primaryKeys"] = []
            unquarantine[q["schema"] + "." + q["table_name"]]["schema"] = q["schema"]
            unquarantine[q["schema"] + "." + q["table_name"]]["table_name"] = q["table_name"]
            unquarantine[q["schema"] + "." + q["table_name"]]["primaryKeys"].append("'" + q["primary_key"] + "'" if q["primary_key_type"] == "uuid" else q["primary_key"])
            unquarantine[q["schema"] + "." + q["table_name"]]["primaryKeyName"] = q["primary_key_name"]
            quarantine_ids.append(q["id"])

        for rule in redact_rules:
            if not landing_db_conn:
                landing_db_name = get_landing_db_name(wf_config)
                landing_db_conn_id = get_landing_db_id(wf_config)
                landing_db_conn = get_landing_db_conn(landing_db_conn_id, landing_db_name)
            orig_schema = rule["schema"]
            if wf_config["dlpEnabled"]:
                # apply redaction rules to quarantine queue instead
                rule["schema"] = "rq_" + rule["schema"]

            last_updated = parser.parse(Variable.get(dag_name + '-lastUpdatedRedactRules', default_var='')) if Variable.get(dag_name + '-lastUpdatedRedactRules', default_var='') else ''
            if not last_updated or (rule["updatedAt"] and parser.parse(rule["updatedAt"]) > last_updated):
                # upsert to table
                rule_check = landing_db_conn.execute("SELECT * FROM public.redactics_masking_rules WHERE schema = %(schema)s AND table_name = %(table_name)s AND column_name = %(column_name)s", {
                    'schema': rule["schema"],
                    'table_name': rule["table"],
                    'column_name': rule["column"]
                }).fetchone()
                updated_at = datetime.now(timezone.utc).isoformat()
                if not rule_check:
                    # insert
                    print("INSERT MASKING RULE")
                    if toggle_dlp:
                        # DLP selection has changed, delete old security label
                        print("REMOVE SECURITY LABEL FOR " + orig_schema + "." + rule["table"] + "." + rule["column"])
                        landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("SET SEARCH_PATH = " + orig_schema)
                        landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("SECURITY LABEL FOR anon ON COLUMN " + rule["table"] + "." + rule["column"] + " IS NULL")
                        landing_db_conn.execute("DELETE FROM public.redactics_masking_rules WHERE schema = '" + orig_schema + "' AND table_name = '" + rule["table"] + "' AND column_name = '" + rule["column"] + "'")
                    landing_db_conn.execute("INSERT INTO public.redactics_masking_rules (schema, table_name, column_name, rule, redact_data, updated_at) VALUES (%(schema)s, %(table_name)s, %(column_name)s, %(rule)s, %(redact_data)s, %(updated_at)s)", {
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
                    landing_db_conn.execute("UPDATE public.redactics_masking_rules SET rule = %(rule)s, redact_data = %(redact_data)s, updated_at = %(updated_at)s WHERE schema = %(schema)s AND table_name = %(table_name)s AND column_name = %(column_name)s", {
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
                    landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("SET SEARCH_PATH = " + rule["schema"])     
                    landing_db_conn.execution_options(isolation_level="AUTOCOMMIT").execute("SELECT public.set_redactions(%(schema)s, %(table_name)s)", {
                        'schema': rule["schema"],
                        'table_name': rule["table"]
                    })
                    Variable.set(dag_name + '-lastUpdatedRedactRules', updated_at)

        # transfer data from quarantine to redacted tables when all decisions have been made for table
        for t in unquarantine.keys():
            table_findings = landing_db_conn.execute("SELECT id, schema, table_name, primary_key, primary_key_name, primary_key_type, scan_action, scan_result FROM public.redactics_quarantine_results WHERE schema = '" + unquarantine[t]["schema"] + "' AND table_name = '" + unquarantine[t]["table_name"] + "' AND scan_action IS NULL").fetchall()
            if not table_findings:
                target_table = re.sub(r'^rq_', 'r_', t)
                redacted_columns_query = landing_db_conn.execute("SELECT anon.mask_filters('" + t + "'::REGCLASS)").fetchone()
                # remove Redactics injected r_sensitive_data_scan column
                redacted_columns = redacted_columns_query["mask_filters"].replace(',r_sensitive_data_scan','')
                redacted_columns = redacted_columns.replace('r_sensitive_data_scan,','')
                print("INSERT INTO " + target_table + " SELECT " + redacted_columns + " FROM " + t + " WHERE " + unquarantine[t]["primaryKeyName"] + " IN (" + ",".join(unquarantine[t]["primaryKeys"]) + ")")
                landing_db_conn.execute("INSERT INTO " + target_table + " SELECT " + redacted_columns + " FROM " + t + " WHERE " + unquarantine[t]["primaryKeyName"] + " IN (" + ",".join(unquarantine[t]["primaryKeys"]) + ")")
            # TODO: test inserting multiple rows
        # delete from quarantine table
        for id in quarantine_ids:
            landing_db_conn.execute("DELETE FROM public.redactics_quarantine_results WHERE id = " + str(id))

    @task(on_failure_callback=post_logs)
    def process_quarantine_queue(**context):
        # TODO: skip if service account is missing
        credentials = service_account.Credentials.from_service_account_file(
    '/opt/google-dlp-serviceaccount/google_service_account')
        dlp_client = google.cloud.dlp_v2.DlpServiceClient(credentials=credentials)

        landing_db_conn_id = Variable.get(dag_name + '-landingDBConnID')
        landing_db_name = Variable.get(dag_name + '-landingDBName')
        landing_db_conn = get_landing_db_conn(landing_db_conn_id, landing_db_name)

        check_quarantine_queue = landing_db_conn.execute("SELECT distinct schema, table_name FROM redactics_quarantine_log").fetchall()
        if len(check_quarantine_queue):
            potentials = []
            # TODO: fetch info_types from Redactics API
            info_types = [{"name": "EMAIL_ADDRESS"}, {"name": "PERSON_NAME"}]
            include_quote = True
            inspect_config = {
                "info_types": info_types,
                "include_quote": include_quote,
            }
            # TODO: don't hardcode this
            parent = "projects/redactics-prod-310503"

            for qidx, q in enumerate(check_quarantine_queue):
                scan_queue = landing_db_conn.execute("SELECT * FROM \"" + q["schema"] + "\".\"" + q["table_name"] + "\" WHERE r_sensitive_data_scan IS NULL").fetchall()

                if scan_queue:
                    # get list of fields potentially containing sensitive info
                    # TODO: add additional data_types
                    potentials_query = landing_db_conn.execute("SELECT * FROM information_schema.columns WHERE table_schema = '" + q["schema"] + "' AND table_name = '" + q["table_name"] + "' AND data_type IN ('character varying')").fetchall()
                    for pidx, p in enumerate(potentials_query):
                        # TODO: exclude ignored/whitelisted columns
                        potentials.append(p["column_name"])
                    print(f"potentials: {potentials}")

                    for sidx, s in enumerate(scan_queue):
                        # get primary key
                        primary_key_query = landing_db_conn.execute("SELECT pg_attribute.attname, format_type(pg_attribute.atttypid, pg_attribute.atttypmod) FROM pg_index, pg_class, pg_attribute, pg_namespace WHERE pg_class.oid = '" + q["schema"] + "." + q["table_name"] + "'::regclass AND indrelid = pg_class.oid AND nspname = '" + q["schema"] + "' AND pg_class.relnamespace = pg_namespace.oid AND pg_attribute.attrelid = pg_class.oid AND pg_attribute.attnum = any(pg_index.indkey) AND indisprimary").fetchone()
                        if primary_key_query:
                            primary_key_field = str(primary_key_query["attname"])
                            primary_key = s[primary_key_query["attname"]]
                            primary_key_datatype = primary_key_query["format_type"]

                            if primary_key:
                                for p in potentials:
                                    print(f"Examining potential: {p}")
                                    content = s[p]
                                    if content:
                                        scan_item = {"value": content}
                                        response = dlp_client.inspect_content(
                                            request={"parent": parent, "inspect_config": inspect_config, "item": scan_item}
                                        )
                                        if response.result.findings:
                                            for finding in response.result.findings:
                                                #print(f"finding: {finding}")
                                                try:
                                                    print(f"Quote: {finding.quote}")
                                                except AttributeError:
                                                    # TODO: better exception handling?
                                                    pass
                                                landing_db_conn.execute("INSERT INTO public.redactics_quarantine_results (schema, table_name, primary_key, column_name, scan_value, scan_result, created_at) VALUES ('" + q["schema"] + "', '" + q["table_name"] + "', '" + str(primary_key) + "', '" + p + "', '" + finding.quote + "', '" + json.dumps({"info_type":finding.info_type.name, "likelihood": finding.likelihood.name}) + "', current_timestamp)")

                                                # mark row as scanned
                                                if primary_key_datatype == "uuid":
                                                    landing_db_conn.execute("UPDATE \"" + q["schema"] + "\".\"" + q["table_name"] + "\" SET r_sensitive_data_scan = current_timestamp WHERE " + primary_key_field + " = '" + primary_key + "'")
                                                else:
                                                    landing_db_conn.execute("UPDATE \"" + q["schema"] + "\".\"" + q["table_name"] + "\" SET r_sensitive_data_scan = current_timestamp WHERE " + primary_key_field + " = " + str(primary_key))

                                                # notify Redactics API for notification triggers

                                                # delete from quarantine log
                                                landing_db_conn.execute("DELETE FROM public.redactics_quarantine_log WHERE schema = '" + q["schema"] + "' AND table_name = '" + q["table_name"] + "'")
                                        else:
                                            print(f"No findings: {response}")

        # GET info types
        # request = google.cloud.dlp_v2.ListInfoTypesRequest()

        # response = dlp_client.list_info_types(request=request)
        # print(response)
    
    landing_db_step = init_landing_db()

    process_quarantine_queue_step = process_quarantine_queue()
    process_quarantine_queue_step.set_upstream(landing_db_step)

    update_redaction_rules_step = update_redaction_rules()
    update_redaction_rules_step.set_upstream(process_quarantine_queue_step)

start_replication = replication()