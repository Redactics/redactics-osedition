#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TABLE=$2
TABLE_NOQUOTES=${TABLE//"\""/}
FIELD_NAME=$3
FIELD_VAL=$4
# "new" or "updated"
POSTFIX=$5

/scripts/prep-certs.sh

if [ -z "$FIELD_VAL" ]
then
    # no updates found in tmp DB, fetch all updates
    psql -c "\copy (SELECT * FROM $TABLE WHERE \"$FIELD_NAME\" IS NOT NULL) TO STDOUT WITH CSV" | curl -X POST -H "Transfer-Encoding: chunked" -s -f -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-${POSTFIX}.csv
else
    psql -c "\copy (SELECT * FROM $TABLE WHERE \"$FIELD_NAME\" > '$FIELD_VAL') TO STDOUT WITH CSV" | curl -X POST -H "Transfer-Encoding: chunked" -s -f -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-${POSTFIX}.csv
fi