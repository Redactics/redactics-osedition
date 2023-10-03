#!/bin/bash

# re-create connections
/opt/connections/add-connections.sh 

echo "*** staging SSL certs"
cp -r /pgcerts-secrets/* /pgcerts/ || true
chmod 0600 /pgcerts/*/..data/sslkey || true

echo "*** staging DAGs"
cp /tmp/erl-functions.sql /opt/airflow/dags/
cp /tmp/replication-*.sql /opt/airflow/dags/
cp /tmp/airflow-log-cleanup.py /opt/airflow/dags/
cp /tmp/refresh-dags.py /opt/airflow/dags/
cp /tmp/heartbeat.py /opt/airflow/dags/
cp /tmp/sampletable-athletes.py /opt/airflow/dags/sampletable-athletes.py
cp /tmp/sampletable-marketing_campaign.py /opt/airflow/dags/sampletable-marketing_campaign.py

# fetch workflows
/fetch-workflows.sh

exec "$@"