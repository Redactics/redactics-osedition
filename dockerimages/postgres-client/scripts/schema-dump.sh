#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TABLES=$2
SEQUENCE_TABLES=$3

/scripts/prep-certs.sh

if [ ! -z $SEQUENCE_TABLES ]; then
    IFS=',' read -r -a sequence_tables <<< "$SEQUENCE_TABLES"
    for table in "${sequence_tables[@]}"
    do
        IFS=':' read -r -a table_map <<< "$table"
        echo "Creating SQL for sequence table ${table_map[1]}"
        pg_dump -t ${table_map[1]} -s -O -x -v | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${table_map[0]}.sql
    done
fi

IFS=',' read -r -a tables <<< "$TABLES"
for table in "${tables[@]}"
do
    echo "Creating SQL for table $table"
    if [ -z $SEQUENCE_TABLES ]; then
        # create schema file
        pg_dump -t $table -s -O -x -v | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${table}.sql
    else
        # append to schema file
        pg_dump -t $table -s -O -x -v | curl -X PUT -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${table}.sql
    fi
done