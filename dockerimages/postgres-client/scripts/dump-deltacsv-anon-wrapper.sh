#!/bin/bash

set -exo pipefail

# outputs CSV of data in table

WORKFLOW=$1
TABLE=$2
TABLE_NOQUOTES=${TABLE//"\""/}
FIELD_NAME=$3
FIELD_VAL=$4
# "new" or "updated"
POSTFIX=$5

/scripts/prep-certs.sh

/scripts/dump-csv-anon.sh -t $TABLE --delta-field-name="$FIELD_NAME" --delta-field-val="$FIELD_VAL" | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-${POSTFIX}.csv