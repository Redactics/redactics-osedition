#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TARGET_DATABASE=$2
TABLES=$3
EXTENSIONS=$4
OVERRIDE_SCHEMA=$5
EXTENSIONS_SCHEMA=$6

/scripts/prep-certs.sh

# add commands to clean all tables and foreign key constraints
rm /tmp/${WORKFLOW}-drop-tables.sql || true

IFS=', ' read -r -a tables <<< "$TABLES"
FOUND_SCHEMA=()

if [ ! -z "$EXTENSIONS_SCHEMA" ]
then
    printf "CREATE SCHEMA IF NOT EXISTS \"$EXTENSIONS_SCHEMA\";\n" >> /tmp/${WORKFLOW}-drop-tables.sql 
fi

for t in "${tables[@]}"
do
    schema=$(echo $t | sed -e "s/\..\+$//")
    table=$(echo $t | sed -e "s/^.\+\.//")

    # create tmp schema if necessary for initial restoration
    if [[ ! " ${FOUND_SCHEMA[*]} " =~ " ${schema} " ]]; then
        echo "Creating SQL to clean table ${schema}.${table}"
        printf "CREATE SCHEMA IF NOT EXISTS \"$schema\";\n" >> /tmp/${WORKFLOW}-drop-tables.sql
        FOUND_SCHEMA+=(${schema})
    fi
    printf "DROP TABLE IF EXISTS \"${schema}\".\"${table}\" CASCADE;\n" >> /tmp/${WORKFLOW}-drop-tables.sql

    if [ ! -z "$OVERRIDE_SCHEMA" ]
    then
        schema=$OVERRIDE_SCHEMA
        if [[ ! " ${FOUND_SCHEMA[*]} " =~ " ${schema} " ]]; then
            # create target schema
            echo "Creating SQL to clean table ${schema}.${table}"
            printf "CREATE SCHEMA IF NOT EXISTS \"$schema\";\n" >> /tmp/${WORKFLOW}-drop-tables.sql
            printf "GRANT ALL ON SCHEMA \"$schema\" TO postgres;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
            printf "GRANT ALL ON SCHEMA \"$schema\" TO \"$schema\";\n" >> /tmp/${WORKFLOW}-drop-tables.sql
            FOUND_SCHEMA+=(${schema})
        fi
        printf "DROP TABLE IF EXISTS \"${schema}\".\"${table}\" CASCADE;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
    fi
done

IFS=', ' read -r -a extensions <<< "$EXTENSIONS"
for e in "${extensions[@]}"
do
    printf "CREATE EXTENSION IF NOT EXISTS \"${e}\" CASCADE;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
    printf "ALTER EXTENSION \"${e}\" SET SCHEMA \"${EXTENSIONS_SCHEMA}\";\n" >> /tmp/${WORKFLOW}-drop-tables.sql
done

if [ "${TARGET_DATABASE}" == "redactics_tmp" ]
then
    # reload extension to install possible updates
    printf "DROP EXTENSION IF EXISTS anon CASCADE;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
    printf "CREATE EXTENSION anon CASCADE;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
    printf "SELECT anon.init();\n" >> /tmp/${WORKFLOW}-drop-tables.sql
fi

cat /tmp/${WORKFLOW}-drop-tables.sql
psql -f /tmp/${WORKFLOW}-drop-tables.sql -d ${TARGET_DATABASE}
