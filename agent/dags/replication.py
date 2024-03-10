from datetime import timedelta, datetime, timezone, date
from dateutil import parser
from urllib.parse import urlparse
from psycopg2.extensions import AsIs
from psycopg2 import sql
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from airflow.decorators import dag, task

import psycopg2
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

    # TODO: support SSL/extra
    try:
        connection = psycopg2.connect("dbname='" + landing_db_name + "' user='" + login + "' host='" + host + "' password='" + password + 
    "'")
    except:
        # can't connect to DB, likely missing landing database, create landing database
        connection = psycopg2.connect("dbname='postgres' user='" + login + "' host='" + host + "' password='" + password + 
        "'")
        connection.autocommit = True
        connection.cursor().execute("CREATE DATABASE " + landing_db_name)

        connection = psycopg2.connect("dbname='" + landing_db_name + "' user='" + login + "' host='" + host + "' password='" + password + 
    "'")
    return connection

def get_landing_db_cur(connection):
    # returns landing/target DB cursor
    return connection.cursor(cursor_factory=RealDictCursor)

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
            landing_db_cur = get_landing_db_cur(landing_db_conn)

            with open("/opt/airflow/dags/replication-functions.sql") as file:
                functions = text(file.read())
                landing_db_cur.execute("%(functions)s", {
                    'functions': AsIs(functions)
                })
                landing_db_conn.commit()

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
            landing_db_cur = get_landing_db_cur(landing_db_conn)

        if int(tableSchemaVersion) == 0:
            # preload anon into future sessions
            landing_db_cur.execute("ALTER DATABASE %(database)s SET session_preload_libraries = 'anon'", {
                'database': AsIs(landing_db_name)
            })
            landing_db_conn.commit()
            # reconnect
            landing_db_conn.close()
            landing_db_conn = get_landing_db_conn(landing_db_conn_id, landing_db_name)
            landing_db_cur = get_landing_db_cur(landing_db_conn)
        
        if int(tableSchemaVersion) != TABLE_SCHEMA_VERSION:
            # update table schema
            print("UPDATING TABLE SCHEMA")

            with open("/opt/airflow/dags/replication-schema-1.sql") as file:
                schema = text(file.read())
                landing_db_cur.execute("%(schema)s", {
                    'schema': AsIs(schema)
                })
                landing_db_conn.commit()
            
            if int(tableSchemaVersion) == 0:
                print("INIT ANON EXTENSION")
                landing_db_cur.execute("DROP EXTENSION IF EXISTS anon CASCADE")
                landing_db_conn.commit()
                landing_db_cur.execute("CREATE EXTENSION anon CASCADE")
                landing_db_conn.commit()
                landing_db_cur.execute("SELECT anon.init()")
                landing_db_conn.commit()

            Variable.set(dag_name + '-tableSchemaVersion', TABLE_SCHEMA_VERSION)

        # check on Redactics role
        if "LANDING_USERS" in os.environ and os.environ['LANDING_USERS'] != "null":
            landing_users = json.loads(os.environ['LANDING_USERS'])
            for user in landing_users:
                landing_db_user = user["user"]
                landing_db_pass = user["password"]
                landing_db_cur.execute("SELECT * FROM pg_roles WHERE rolname = %(username)s", {
                    'username': landing_db_user
                })
                check_landing_user = landing_db_cur.fetchone()
                if not check_landing_user:
                    print("CREATE LANDING DB USER " + landing_db_user)
                    landing_db_cur.execute("CREATE ROLE %(username)s WITH LOGIN PASSWORD %(password)s", {
                        'username': AsIs(landing_db_user),
                        'password': landing_db_pass
                    })
                    landing_db_conn.commit()
                    # create record of landing db user so that grants can be issued on new schema creation
                    landing_db_cur.execute("SELECT * FROM redactics_landingdb_users WHERE username = %(username)s", {
                        'username': landing_db_user
                    })
                    check_landing_user = landing_db_cur.fetchone()
                    if not check_landing_user:
                        landing_db_cur.execute("INSERT INTO redactics_landingdb_users (username) VALUES (%(username)s)", {
                            'username': landing_db_user
                        })
                        landing_db_conn.commit()

    @task(on_failure_callback=post_logs)
    def process_quarantine_queue(**context):
        # TODO: skip if service account is missing
        credentials = service_account.Credentials.from_service_account_file(
    '/opt/google-dlp-serviceaccount/google_service_account')
        dlp_client = google.cloud.dlp_v2.DlpServiceClient(credentials=credentials)

        landing_db_conn_id = Variable.get(dag_name + '-landingDBConnID')
        landing_db_name = Variable.get(dag_name + '-landingDBName')
        landing_db_conn = get_landing_db_conn(landing_db_conn_id, landing_db_name)
        landing_db_cur = get_landing_db_cur(landing_db_conn)

        landing_db_cur.execute("SELECT distinct schema, table_name FROM public.redactics_quarantine_log")
        check_quarantine_queue = landing_db_cur.fetchall()
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
                query = sql.SQL("SELECT * FROM {} WHERE r_sensitive_data_scan IS NULL").format(
                    sql.Identifier(q["schema"], q["table_name"])
                )
                landing_db_cur.execute(query)
                scan_queue = landing_db_cur.fetchall()

                if scan_queue:
                    # get list of fields potentially containing sensitive info
                    # TODO: add additional data_types
                    landing_db_cur.execute("SELECT s.table_schema, s.table_name, s.column_name, mr.rule FROM information_schema.columns s LEFT JOIN public.redactics_masking_rules mr ON (s.table_schema = mr.schema AND s.table_name = mr.table_name AND s.column_name = mr.column_name) WHERE s.table_schema = %(schema)s AND s.table_name = %(table_name)s AND s.data_type IN ('character varying')", {
                        'schema': q["schema"],
                        'table_name': q["table_name"]
                    })
                    potentials_query = landing_db_cur.fetchall()
                    for pidx, p in enumerate(potentials_query):
                        if not p["rule"]:
                            # no rule has been set for column, queue for DLP scan
                            potentials.append(p["column_name"])
                    print(f"potentials: {potentials}")

                    # get primary key
                    landing_db_cur.execute(sql.SQL("SELECT pg_attribute.attname, format_type(pg_attribute.atttypid, pg_attribute.atttypmod) FROM pg_index, pg_class, pg_attribute, pg_namespace WHERE pg_class.oid = '{}'::regclass AND indrelid = pg_class.oid AND nspname = %(schema)s AND pg_class.relnamespace = pg_namespace.oid AND pg_attribute.attrelid = pg_class.oid AND pg_attribute.attnum = any(pg_index.indkey) AND indisprimary").format(
                        sql.Identifier(q["schema"], q["table_name"])
                    ), {
                        'schema': q["schema"]
                    })
                    primary_key_query = landing_db_cur.fetchone()

                    findings = 0
                    for sidx, s in enumerate(scan_queue):
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
                                        # check to see if there has already been a decision made to skip DLP API call
                                        # and prefill scan_action field

                                        response = dlp_client.inspect_content(
                                            request={"parent": parent, "inspect_config": inspect_config, "item": scan_item}
                                        )
                                        if response.result.findings:
                                            findings += 1
                                            for finding in response.result.findings:
                                                #print(f"finding: {finding}")
                                                try:
                                                    print(f"Quote: {finding.quote}")
                                                except AttributeError:
                                                    # TODO: better exception handling?
                                                    pass
                                                # prevent duplicates
                                                landing_db_cur.execute("SELECT * FROM public.redactics_quarantine_results WHERE schema = %(schema)s AND table_name = %(table_name)s AND column_name = %(column_name)s AND scan_value = %(scan_value)s", {
                                                    'schema': q["schema"],
                                                    'table_name': q["table_name"],
                                                    'column_name': p,
                                                    'scan_value': finding.quote
                                                })
                                                dupe_check = landing_db_cur.fetchone()
                                                if not dupe_check:
                                                    print("WRITING TO QUARANTINE TABLE")
                                                    landing_db_cur.execute("INSERT INTO public.redactics_quarantine_results (schema, table_name, primary_key, primary_key_name, primary_key_type, column_name, scan_value, scan_result, created_at) VALUES (%(schema)s, %(table_name)s, %(primary_key)s, %(primary_key_field)s, %(primary_key_datatype)s, %(column_name)s, %(scan_value)s, %(scan_result)s, current_timestamp)", {
                                                        'schema': q["schema"],
                                                        'table_name': q["table_name"],
                                                        'primary_key': primary_key,
                                                        'primary_key_field': primary_key_field,
                                                        'primary_key_datatype': primary_key_datatype,
                                                        'column_name': p,
                                                        'scan_value': finding.quote,
                                                        'scan_result': json.dumps({"info_type":finding.info_type.name, "likelihood": finding.likelihood.name})
                                                    })
                                                    landing_db_conn.commit()

                                                # notify Redactics API for notification triggers

                                                # delete from quarantine log
                                                landing_db_cur.execute("DELETE FROM public.redactics_quarantine_log WHERE schema = %(schema)s AND table_name = %(table_name)s", {
                                                    'schema': q["schema"],
                                                    'table_name': q["table_name"]
                                                })
                                                landing_db_conn.commit()
                                        else:
                                            print(f"No findings: {response}")

                                if not findings:
                                    # transfer directly to final table
                                    print("NO SCAN FIELDS, SKIPPING QUARANTINE")
                                    target_schema = re.sub(r'^rq_', 'r_', q["schema"])
                                    landing_db_cur.execute("SELECT anon.mask_filters(%(table)s::REGCLASS)", {
                                        'table': q["schema"] + "." + q["table_name"]
                                    })
                                    redacted_columns_query = landing_db_cur.fetchone()
                                    # remove Redactics injected r_sensitive_data_scan column
                                    redacted_columns = redacted_columns_query["mask_filters"].replace(',r_sensitive_data_scan','')
                                    redacted_columns = redacted_columns.replace('r_sensitive_data_scan,','')
                                    # print("INSERT INTO " + target_table + " SELECT " + redacted_columns + " FROM " + t + " WHERE " + unquarantine[t]["primaryKeyName"] + " IN (" + ",".join(unquarantine[t]["primaryKeys"]) + ")")
                                    landing_db_cur.execute(sql.SQL("INSERT INTO {} SELECT %(redacted_columns)s FROM {} WHERE {} = %(primary_keys)s").format(
                                        sql.Identifier(target_schema, q["table_name"]),
                                        sql.Identifier(q["schema"], q["table_name"]),
                                        sql.Identifier(primary_key_field)
                                    ), {
                                        'redacted_columns': AsIs(redacted_columns),
                                        'primary_keys': AsIs(primary_key)
                                    })
                                    landing_db_conn.commit()

                                
                                print("MARK AS SCANNED")
                                # mark row as scanned
                                landing_db_cur.execute(sql.SQL("UPDATE {} SET r_sensitive_data_scan = current_timestamp WHERE {} = %(primary_key)s").format(
                                    sql.Identifier(q["schema"], q["table_name"]),
                                    sql.Identifier(primary_key_field)
                                ), {
                                    'primary_key': primary_key
                                })
                                landing_db_conn.commit()

        # GET info types
        # request = google.cloud.dlp_v2.ListInfoTypesRequest()

        # response = dlp_client.list_info_types(request=request)
        # print(response)
    
    def assign_ruleset(dlp_info_type):
        if dlp_info_type == "EMAIL_ADDRESS":
            print('email')
            rule = {
                'rule': 'redact_email',
                'redactData': {
                    'domain': 'redactics.com'
                }
            }
        elif dlp_info_type == 'PERSON_NAME':
            print('person name')
            rule = {
                'rule': 'replacement',
                'redactData': {
                    'replacement': 'redacted'
                }
            }

        return rule

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
        landing_db_cur = get_landing_db_cur(landing_db_conn)
        toggle_dlp = False
        if wf_config["dlpEnabled"] and str(wf_config["dlpEnabled"]) != Variable.get(dag_name + '-dlpEnabled', default_var=False):
            # enable DLP
            print("ENABLE DLP TRIGGERS")
            landing_db_cur.execute("DROP EVENT TRIGGER IF EXISTS ddl_trigger")
            landing_db_conn.commit()
            landing_db_cur.execute("DROP EVENT TRIGGER IF EXISTS ddl_dlp_trigger")
            landing_db_conn.commit()
            landing_db_cur.execute("CREATE EVENT TRIGGER ddl_dlp_trigger ON ddl_command_end EXECUTE FUNCTION ddl_dlp_trigger_func()")
            landing_db_conn.commit()
            Variable.set(dag_name + '-dlpEnabled', True)
            # mark redaction rules for reset
            Variable.delete(dag_name + '-lastUpdatedRedactRules')
            toggle_dlp = True
        elif not wf_config["dlpEnabled"] and str(wf_config["dlpEnabled"]) != Variable.get(dag_name + '-dlpEnabled', default_var=False):
            # disable DLP
            print("DISABLE DLP TRIGGERS")
            landing_db_cur.execute("DROP EVENT TRIGGER IF EXISTS ddl_trigger")
            landing_db_conn.commit()
            landing_db_cur.execute("DROP EVENT TRIGGER IF EXISTS ddl_dlp_trigger")
            landing_db_conn.commit()
            landing_db_cur.execute("CREATE EVENT TRIGGER ddl_trigger ON ddl_command_end EXECUTE FUNCTION ddl_trigger_func()")
            landing_db_conn.commit()
            Variable.set(dag_name + '-dlpEnabled', False)
            # mark redaction rules for reset
            Variable.delete(dag_name + '-lastUpdatedRedactRules')
            toggle_dlp = True

        # gather scan action decisions and update ruleset
        landing_db_cur.execute("SELECT id, schema, table_name, column_name, primary_key, primary_key_name, primary_key_type, scan_action, scan_result FROM public.redactics_quarantine_results WHERE scan_action IS NOT NULL")
        scan_actions = landing_db_cur.fetchall()
        unquarantine = {}
        quarantine_ids = []
        for q in scan_actions:
            if q["scan_action"] == "ignore":
                # API call to redact rules to create ignore whitelist/stub to block future scanning of column
                # add to local ruleset
                print("ignore")
            elif q["scan_action"] == "accept":
                # API call to redact rules
                # add to local ruleset
                rule = assign_ruleset(q["scan_result"]["info_type"])

                redact_rules.append({
                    'schema': q["schema"],
                    'table': q["table_name"],
                    'column': q["column_name"],
                    'rule': rule['rule'],
                    'redactData': rule['redactData'],
                    'updatedAt': datetime.now(timezone.utc).isoformat()
                })

            if (q["schema"] + "." + q["table_name"]) not in unquarantine:
                unquarantine[q["schema"] + "." + q["table_name"]] = {}
            if "primaryKeys" not in unquarantine[q["schema"] + "." + q["table_name"]]:
                unquarantine[q["schema"] + "." + q["table_name"]]["primaryKeys"] = []
            unquarantine[q["schema"] + "." + q["table_name"]]["schema"] = q["schema"]
            unquarantine[q["schema"] + "." + q["table_name"]]["table_name"] = q["table_name"]
            if q["primary_key"] not in unquarantine[q["schema"] + "." + q["table_name"]]["primaryKeys"]:
                unquarantine[q["schema"] + "." + q["table_name"]]["primaryKeys"].append(q["primary_key"])
            unquarantine[q["schema"] + "." + q["table_name"]]["primaryKeyName"] = q["primary_key_name"]
            quarantine_ids.append(q["id"])
        
        updated_at = datetime.now(timezone.utc).isoformat()
        for rule in redact_rules:
            if not landing_db_cur:
                landing_db_name = get_landing_db_name(wf_config)
                landing_db_conn_id = get_landing_db_id(wf_config)
                landing_db_conn = get_landing_db_conn(landing_db_conn_id, landing_db_name)
                landing_db_cur = get_landing_db_cur(landing_db_conn)
            orig_schema = rule["schema"]
            if wf_config["dlpEnabled"] and not rule["schema"].startswith('rq_'):
                # apply redaction rules to quarantine queue instead
                rule["schema"] = "rq_" + rule["schema"]

            last_updated = parser.parse(Variable.get(dag_name + '-lastUpdatedRedactRules', default_var='')) if Variable.get(dag_name + '-lastUpdatedRedactRules', default_var='') else ''
            if not last_updated or (rule["updatedAt"] and parser.parse(rule["updatedAt"]) > last_updated):
                print("UPSERT")
                # upsert to table
                landing_db_cur.execute("SELECT * FROM public.redactics_masking_rules WHERE schema = %(schema)s AND table_name = %(table_name)s AND column_name = %(column_name)s", {
                    'schema': rule["schema"],
                    'table_name': rule["table"],
                    'column_name': rule["column"]
                })
                rule_check = landing_db_cur.fetchone()
                if not rule_check:
                    # insert
                    print("INSERT MASKING RULE")
                    if toggle_dlp:
                        # DLP selection has changed, delete old security label
                        print("REMOVE SECURITY LABEL FOR " + orig_schema + "." + rule["table"] + "." + rule["column"])
                        landing_db_cur.execute("SET SEARCH_PATH = " + orig_schema)
                        landing_db_cur.execute("SECURITY LABEL FOR anon ON COLUMN " + rule["table"] + "." + rule["column"] + " IS NULL")
                        landing_db_cur.execute("DELETE FROM public.redactics_masking_rules WHERE schema = %(schema)s AND table_name = %(table_name)s AND column_name = %(column_name)s", {
                           'schema': orig_schema,
                            'table_name': rule["table"],
                            'column_name': rule["column"]
                        })
                        landing_db_conn.commit()
                        landing_db_cur.execute("SET SEARCH_PATH = public")
                        landing_db_conn.commit()
                    landing_db_cur.execute("INSERT INTO public.redactics_masking_rules (schema, table_name, column_name, rule, redact_data, updated_at) VALUES (%(schema)s, %(table_name)s, %(column_name)s, %(rule)s, %(redact_data)s, %(updated_at)s)", {
                        'schema': rule["schema"],
                        'table_name': rule["table"],
                        'column_name': rule["column"],
                        'rule': rule["rule"],
                        'redact_data': json.dumps(rule["redactData"]),
                        'updated_at': updated_at
                    })
                    landing_db_conn.commit()
                else:
                    # update
                    print("UPDATE MASKING RULE")
                    landing_db_cur.execute("UPDATE public.redactics_masking_rules SET rule = %(rule)s, redact_data = %(redact_data)s, updated_at = %(updated_at)s WHERE schema = %(schema)s AND table_name = %(table_name)s AND column_name = %(column_name)s", {
                        'schema': rule["schema"],
                        'table_name': rule["table"],
                        'column_name': rule["column"],
                        'rule': rule["rule"],
                        'redact_data': json.dumps(rule["redactData"]),
                        'updated_at': updated_at
                    })
                    landing_db_conn.commit()
                # don't apply masking rules if the schema/table hasn't been created yet
                landing_db_cur.execute("SELECT 1 FROM pg_tables WHERE schemaname = %(schema)s AND tablename = %(table_name)s", {
                    'schema': rule["schema"],
                    'table_name': rule["table"]
                })
                table_check = landing_db_cur.fetchone()
                if table_check:
                    print("APPLY MASKING RULES")
                    landing_db_cur.execute("SET SEARCH_PATH = " + rule["schema"])  
                    landing_db_cur.execute("SELECT public.set_redactions(%(schema)s, %(table_name)s)", {
                        'schema': rule["schema"],
                        'table_name': rule["table"]
                    })
                    landing_db_conn.commit()
                    landing_db_cur.execute("SET SEARCH_PATH = public")
                    landing_db_conn.commit()
        Variable.set(dag_name + '-lastUpdatedRedactRules', updated_at)

        # transfer data from quarantine to redacted tables when all decisions have been made for table
        for t in unquarantine.keys():
            landing_db_cur.execute("SELECT id, schema, table_name, primary_key, primary_key_name, primary_key_type, scan_action, scan_result FROM public.redactics_quarantine_results WHERE schema = %(schema)s AND table_name = %(table_name)s AND scan_action IS NULL", {
                'schema': unquarantine[t]["schema"],
                'table_name': unquarantine[t]["table_name"]
            })
            table_findings = landing_db_cur.fetchall()
            if not table_findings:
                target_schema = re.sub(r'^rq_', 'r_', unquarantine[t]["schema"])
                landing_db_cur.execute("SELECT anon.mask_filters(%(table)s::REGCLASS)", {
                    'table': t
                })
                redacted_columns_query = landing_db_cur.fetchone()
                # remove Redactics injected r_sensitive_data_scan column
                redacted_columns = redacted_columns_query["mask_filters"].replace(',r_sensitive_data_scan','')
                redacted_columns = redacted_columns.replace('r_sensitive_data_scan,','')
                # print("INSERT INTO " + target_table + " SELECT " + redacted_columns + " FROM " + t + " WHERE " + unquarantine[t]["primaryKeyName"] + " IN (" + ",".join(unquarantine[t]["primaryKeys"]) + ")")
                landing_db_cur.execute(sql.SQL("INSERT INTO {} SELECT %(redacted_columns)s FROM {} WHERE {} IN (%(primary_keys)s)").format(
                    sql.Identifier(target_schema, unquarantine[t]["table_name"]),
                    sql.Identifier(unquarantine[t]["schema"], unquarantine[t]["table_name"]),
                    sql.Identifier(unquarantine[t]["primaryKeyName"])
                ), {
                    'redacted_columns': AsIs(redacted_columns),
                    'primary_keys': AsIs(",".join(unquarantine[t]["primaryKeys"]))
                })
                landing_db_conn.commit()
            # TODO: test inserting multiple rows
        # delete from quarantine table
        for id in quarantine_ids:
            landing_db_cur.execute("DELETE FROM public.redactics_quarantine_results WHERE id = %(id)s", {
                'id': id
            })
            landing_db_conn.commit()
    
    landing_db_step = init_landing_db()

    process_quarantine_queue_step = process_quarantine_queue()
    process_quarantine_queue_step.set_upstream(landing_db_step)

    update_redaction_rules_step = update_redaction_rules()
    update_redaction_rules_step.set_upstream(process_quarantine_queue_step)

start_replication = replication()