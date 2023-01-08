#!/bin/bash

set -exo pipefail

# outputs CSV of data in table

WORKFLOW=$1
TABLE=$2
COLUMNS=$3
START_DATE=$4
SAMPLE_FIELDS=$5
CREATED_AT_FIELD=$6
UPDATED_AT_FIELD=$7

/scripts/prep-certs.sh

if [ -z $START_DATE ]
then
  /scripts/dump-csv-anon.sh -t $TABLE -c $COLUMNS | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Ftable-${TABLE}.csv
else
  /scripts/dump-csv-anon.sh -t $TABLE -c $COLUMNS --start-date=$START_DATE --sample-fields=$SAMPLE_FIELDS --created-at=$CREATED_AT_FIELD --updated-at=$UPDATED_AT_FIELD | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Ftable-${TABLE}.csv
fi