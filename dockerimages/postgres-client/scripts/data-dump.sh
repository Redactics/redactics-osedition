#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TABLE=$2
TABLE_NOQUOTES=${TABLE//"\""/}
START_DATE=$3
SAMPLE_FIELDS=$4
CREATED_AT_FIELD=$5
UPDATED_AT_FIELD=$6

/scripts/prep-certs.sh

PSQL="psql --quiet --tuples-only --no-align"

if [ -z "$START_DATE" ]
then
  $PSQL -c "\copy (SELECT * FROM $TABLE) TO STDOUT WITH CSV HEADER" | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fdump-${TABLE_NOQUOTES}.csv
elif [ ! -z $START_DATE ]
then
  if [ "$SAMPLE_FIELDS" == "created" ]
  then
    $PSQL -c "\copy (SELECT * FROM $TABLE WHERE \"$CREATED_AT_FIELD\" IS NOT NULL AND \"$CREATED_AT_FIELD\" > '$START_DATE') TO STDOUT WITH CSV HEADER" | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fdump-${TABLE_NOQUOTES}.csv
  elif [ "$SAMPLE_FIELDS" == "updated" ]
  then
    $PSQL -c "\copy (SELECT * FROM $TABLE WHERE \"$UPDATED_AT_FIELD\" IS NOT NULL AND \"$UPDATED_AT_FIELD\" > '$START_DATE') TO STDOUT WITH CSV HEADER" | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fdump-${TABLE_NOQUOTES}.csv
  elif [ "$SAMPLE_FIELDS" == "createdAndUpdated" ]
  then
    $PSQL -c "\copy (SELECT * FROM $TABLE WHERE (\"$CREATED_AT_FIELD\" IS NOT NULL AND \"$CREATED_AT_FIELD\" > '$START_DATE') OR (\"$UPDATED_AT_FIELD\" IS NOT NULL AND \"$UPDATED_AT_FIELD\" > '$START_DATE')) TO STDOUT WITH CSV HEADER" | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fdump-${TABLE_NOQUOTES}.csv
  fi
fi