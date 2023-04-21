#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TABLE=$2
TABLE_NOSCHEMA=$(echo $TABLE | cut -d "." -f 2)
TABLE_NOSCHEMA=${TABLE_NOSCHEMA//"\""/}
TABLE_NOQUOTES=${TABLE//"\""/}
INPUT_ID=$3

/scripts/prep-certs.sh

# check that file was created
check=$(curl -s http://agent-http-nas:3000/file/${WORKFLOW}%2Fdump-public.${TABLE_NOSCHEMA}.csv/wc)
if [ "$check" != "Not Found" ]
then
    # reset table in the event of task restarts
    psql -c "TRUNCATE TABLE \"${WORKFLOW}\".\"${TABLE_NOSCHEMA}\";"
    curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdump-public.${TABLE_NOSCHEMA}.csv | psql -c "\copy \"${WORKFLOW}\".\"${TABLE_NOSCHEMA}\" from stdin DELIMITER ',' csv header"
    # mark full copy
    curl -X PUT -d "{\"inputId\": \"${INPUT_ID}\", \"tableName\": \"${TABLE_NOQUOTES}\"}" -H "Content-Type: application/json" -s ${API_URL}/workflow/markFullCopy
fi
