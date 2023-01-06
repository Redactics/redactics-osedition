#!/bin/bash

# re-create connections
/opt/connections/add-connections.sh 

echo "*** staging SSL certs"
cp -r /pgcerts-secrets/* /pgcerts/ || true
chmod 0600 /pgcerts/*/..data/sslkey || true

echo "*** staging DAGs"
cp /tmp/functions.sql /opt/airflow/dags/
cp /tmp/airflow-log-cleanup.py /opt/airflow/dags/
cp /tmp/heartbeat.py /opt/airflow/dags/
cp /tmp/sampletable-athletes.py /opt/airflow/dags/sampletable-athletes.py
cp /tmp/sampletable-marketing_campaign.py /opt/airflow/dags/sampletable-marketing_campaign.py
cp /tmp/erl-evaluation.py /opt/airflow/dags/erl-evaluation.py

# fetch workflows
workflows=`curl -s -H "Content-Type: application/json" ${API_URL}/workflow | jq -r .workflows`
total_workflows=`echo $workflows | jq length`

#workflows_json=`echo $WORKFLOWS | base64 -d | jq .`
#total_workflows=`echo $workflows_json | jq length`
idx=0
until [ $idx -eq $total_workflows ]; do
  workflow_id=`echo $workflows | jq -r '.[$idx].uuid'`
  workflow_type=`echo $workflows | jq -r '.[$idx].workflowType'`
  if [ "$workflow_type" = "ERL" ]; then
    cp /tmp/redactics.py /opt/airflow/dags/${workflow_id}.py
  elif [ "$workflow_type" = "mockDatabaseMigration" ]; then
    cp /tmp/db-migration-mocking.py /opt/airflow/dags/${workflow_id}-migrationmocking.py
  fi

  let idx+=1
done
echo "*** DAGs staged"

exec "$@"