import logging
import os
from datetime import timedelta

import airflow
from airflow.configuration import conf
from airflow.models import DAG, Variable
from airflow.operators.bash_operator import BashOperator
from airflow.operators.dummy_operator import DummyOperator

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

dag = DAG(
    "refresh-dags",
    default_args=default_args,
    schedule_interval="*/5 * * * *",
    start_date=airflow.utils.dates.days_ago(1),
    catchup=False,
)

refresh_dags = """

echo "*** Refreshing dags"
/fetch-workflows.sh

"""

refresh_dags_op = BashOperator(
            task_id='refresh-dags',
            bash_command=refresh_dags,
            dag=dag)