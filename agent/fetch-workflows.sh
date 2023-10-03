#!/bin/bash

echo "*** fetching workflows"
workflows=`curl -s -H "Content-Type: application/json" ${API_URL}/workflow | jq -r ".workflows"`
total_workflows=`echo $workflows | jq length`

idx=0
echo "$total_workflows found"
if [ $total_workflows -gt 0 ]; then
  until [ $idx -eq $total_workflows ]; do
  workflow_id=`echo $workflows | jq -r ".[$idx].uuid"`
  workflow_type=`echo $workflows | jq -r ".[$idx].workflowType"`
  if [ "$workflow_type" = "replication" ]; then
      cp /tmp/replication.py /opt/airflow/dags/${workflow_id}.py
  elif [ "$workflow_type" = "ERL" ]; then
      cp /tmp/redactics.py /opt/airflow/dags/${workflow_id}.py
  elif [ "$workflow_type" = "mockDatabaseMigration" ]; then
      cp /tmp/db-migration-mocking.py /opt/airflow/dags/${workflow_id}-migrationmocking.py
  fi

  let idx+=1
  done
fi