#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TMP_DATABASE=$2
TABLE=$3
INPUT_ID=$4

/scripts/prep-certs.sh

if [ -z $TABLE ]
then
    curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fpgdump | pg_restore -O -d ${TMP_DATABASE}
else
    curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fpgdump-${TABLE} | pg_restore -O -d ${TMP_DATABASE}
fi

curl -X PUT -d "{\"inputId\": \"${INPUT_ID}\", \"tableName\": \"${TABLE}\"}" -H "Content-Type: application/json" -s ${API_URL}/workflow/markFullCopy