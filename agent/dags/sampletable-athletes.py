from datetime import timedelta
from urllib.parse import urlparse
from sqlalchemy import create_engine, select, func, Table, Column, MetaData, and_, text

import glob
import airflow
import json
import os
import requests
import re
import urllib.request
import pandas as pd
from airflow import DAG
from airflow import AirflowException
from airflow.hooks.base_hook import BaseHook
from airflow.operators.python_operator import PythonOperator
from airflow.models import Variable

API_URL = os.environ['API_URL']

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': airflow.utils.dates.days_ago(2),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 0,
    'retry_delay': timedelta(minutes=5),
    # 'queue': 'bash_queue',
    # 'pool': 'backfill',
    # 'priority_weight': 10,
    # 'end_date': datetime(2016, 1, 1),
}

dag = DAG(
    'sampletable-athletes',
    default_args=default_args,
    description='install/update athletes sample DB',
    schedule_interval=None,
    catchup=False
    )

def post_logs(context):
    try:
        tryNumber = context["task_instance"].try_number
        exception = context["exception"]

        logs = open(glob.glob("/opt/airflow/logs/dag_id=" + context["dag"].dag_id + "/run_id=" + context["run_id"] + "/task_id=" + context["task"].task_id + "/**/*" + str(tryNumber - 1) + ".log", recursive=True)[0], "r")

        exception = str(exception)
        stackTrace = str(logs.read())

        headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
        apiUrl = API_URL + '/workflow/job/' + Variable.get("st-athletes-currentWorkflowJobId") + '/postException'
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
        apiUrl = API_URL + '/workflow/job/' + Variable.get("st-athletes-currentWorkflowJobId") + '/postException'
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
    print('postTaskEnd ' + context["task_instance"].task_id)
    headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
    apiUrl = API_URL + '/workflow/job/' + Variable.get("st-athletes-currentWorkflowJobId") + '/postTaskEnd'
    payload = {
        'task': context["task_instance"].task_id,
        'totalTaskNum': 3,
        'lastTask': 'install-sampletable'
    }
    payloadJSON = json.dumps(payload)
    request = requests.put(apiUrl, data=payloadJSON, headers=headers)
    response = request.json()
    try:
        if request.status_code != 200:
            raise AirflowException(response)
    except AirflowException as err: 
        raise AirflowException(err)

def init_wf(ds, **kwargs):
    headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
    apiUrl = API_URL + '/workflow/jobs'
    payload = {
        'workflowType': 'sampletable-athletes'
    }
    payloadJSON = json.dumps(payload)
    request = requests.post(apiUrl, data=payloadJSON, headers=headers)
    response = request.json()
    print(response)
    try:
        if request.status_code != 200:
            raise AirflowException(response)
        Variable.set("st-athletes-currentWorkflowJobId", response["uuid"])
    except AirflowException as err:
        raise AirflowException(err)

def terminate_wf(ds, **kwargs):
    headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
    apiUrl = API_URL + '/workflow/job/' + Variable.get("st-athletes-currentWorkflowJobId") + '/postJobEnd'
    request = requests.put(apiUrl, headers=headers)
    response = request.json()
    try:
        if request.status_code != 200:
            raise AirflowException(response)
    except AirflowException as err: 
        raise AirflowException(err)

def install_sampletable(**ds):
    data_schema = urllib.request.urlopen('https://raw.githubusercontent.com/Redactics/redactics-sampledatasets/master/2020-olympic-athletes/athletes-schema.sql')
    csv_data = urllib.request.urlretrieve('https://raw.githubusercontent.com/Redactics/redactics-sampledatasets/master/2020-olympic-athletes/athletes.csv', '/tmp/athletes.csv')

    input = ds["dag_run"].conf["input"]

    host = BaseHook.get_connection(input).host
    login = BaseHook.get_connection(input).login
    password = BaseHook.get_connection(input).password
    schema = BaseHook.get_connection(input).schema
    extra = json.loads(BaseHook.get_connection(input).extra) if BaseHook.get_connection(input).extra else ""

    connection = create_engine('postgresql://{login}:{password}@{host}/{schema}'
                 .format(login=login, password=password, host=host, schema=schema), connect_args=extra, echo=False)

    # assure clean install
    connection.execute('DROP TABLE IF EXISTS athletes')
    sql = data_schema.read().decode('utf-8')
    connection.execute(sql)
    connection.execute('ALTER SEQUENCE athletes_id_seq RESTART WITH 1')
    
    data = pd.read_csv('/tmp/athletes.csv')
    df = pd.DataFrame(data)
    df.to_sql('athletes', con=connection, index=False, if_exists='append', chunksize=100)

    # attach timestamp fields and data
    connection.execute('ALTER TABLE athletes ADD COLUMN created_at timestamp, ADD COLUMN updated_at timestamp')
    connection.execute('UPDATE athletes SET created_at = CURRENT_TIMESTAMP')

init_workflow = PythonOperator(
    task_id='init-workflow',
    provide_context=True,
    python_callable=init_wf,
    on_failure_callback=post_logs,
    on_success_callback=post_taskend,
    dag=dag,
    )

install = PythonOperator(
    task_id='install-sampletable',
    provide_context=True,
    python_callable=install_sampletable,
    on_failure_callback=post_logs,
    on_success_callback=post_taskend,
    dag=dag,
)

terminate_workflow = PythonOperator(
    task_id='terminate-workflow',
    provide_context=True,
    python_callable=terminate_wf,
    on_failure_callback=post_logs,
    dag=dag,
    )

install.set_upstream(init_workflow)
terminate_workflow.set_upstream(install)
