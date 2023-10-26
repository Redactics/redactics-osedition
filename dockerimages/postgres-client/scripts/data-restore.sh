#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TABLE=$2
SCHEMA=$(echo $TABLE | cut -d "." -f 1)
SCHEMA=${SCHEMA//"\""/}
TABLE_NOSCHEMA=$(echo $TABLE | cut -d "." -f 2)
TABLE_NOSCHEMA=${TABLE_NOSCHEMA//"\""/}
TABLE_NOQUOTES=${TABLE//"\""/}
INPUT_ID=$3

/scripts/prep-certs.sh

# check that file was created
check=$(curl -s http://agent-http-nas:3000/file/${WORKFLOW}%2Fdump-${SCHEMA}.${TABLE_NOSCHEMA}.csv/check)
if [ "$check" != "Not Found" ]
then
    # reset table in the event of task restarts
    psql -c "TRUNCATE TABLE \"${SCHEMA}\".\"${TABLE_NOSCHEMA}\";"
    curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdump-${SCHEMA}.${TABLE_NOSCHEMA}.csv | psql -c "\copy \"${SCHEMA}\".\"${TABLE_NOSCHEMA}\" from stdin DELIMITER ',' csv header"
fi
