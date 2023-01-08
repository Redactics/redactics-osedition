#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TMP_DATABASE=$2
TABLES=$3

/scripts/prep-certs.sh

IFS=',' read -r -a tables <<< "$TABLES"
for table in "${tables[@]}"
do
    echo "Restoring SQL for table $table"
    curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${table}.sql | psql -d ${TMP_DATABASE}
done