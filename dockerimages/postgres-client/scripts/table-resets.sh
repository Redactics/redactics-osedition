#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TMP_DATABASE=$2
TABLES=$3
EXTENSIONS=$4
OVERRIDE_SCHEMA=$5

/scripts/prep-certs.sh

# add commands to clean all tables and foreign key constraints
rm /tmp/${WORKFLOW}-drop-tables.sql || true

IFS=', ' read -r -a tables <<< "$TABLES"
FOUND_SCHEMA=()
for t in "${tables[@]}"
do
    echo "Creating SQL to clean table $t"
    if [ ! -z "$OVERRIDE_SCHEMA" ]
    then
        schema=$OVERRIDE_SCHEMA
    else
        schema=$(echo $t | sed -e "s/\..\+$//")
    fi
    table=$(echo $t | sed -e "s/^.\+\.//")
    if [[ ! " ${FOUND_SCHEMA[*]} " =~ " ${schema} " ]]; then
        printf "CREATE SCHEMA IF NOT EXISTS \"$schema\";\n" >> /tmp/${WORKFLOW}-drop-tables.sql
        printf "GRANT ALL ON SCHEMA \"$schema\" TO postgres;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
        printf "GRANT ALL ON SCHEMA \"$schema\" TO \"$schema\";\n" >> /tmp/${WORKFLOW}-drop-tables.sql
        FOUND_SCHEMA+=(${schema})
    fi
    printf "DROP TABLE IF EXISTS \"${schema}\".\"${table}\" CASCADE;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
done

if [ -z "$OVERRIDE_SCHEMA" ]
then
    printf "SET search_path TO \"$OVERRIDE_SCHEMA\";\n" >> /tmp/${WORKFLOW}-drop-tables.sql
fi

IFS=', ' read -r -a extensions <<< "$EXTENSIONS"
for e in "${extensions[@]}"
do
    printf "CREATE EXTENSION IF NOT EXISTS \"${e}\";\n" >> /tmp/${WORKFLOW}-drop-tables.sql
done

cat /tmp/${WORKFLOW}-drop-tables.sql
psql -f /tmp/${WORKFLOW}-drop-tables.sql -d ${TMP_DATABASE}
