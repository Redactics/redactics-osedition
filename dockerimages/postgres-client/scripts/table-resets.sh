#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TMP_DATABASE=$2
TABLES=$3

/scripts/prep-certs.sh

# add commands to clean all tables and foreign key constraints
rm /tmp/${WORKFLOW}-drop-tables.sql || true
IFS=', ' read -r -a tables <<< "$TABLES"
FOUND_SCHEMA=()
for t in "${tables[@]}"
do
    echo "Creating SQL to clean table $t"
    schema=$(echo $t | sed -e "s/\..\+$//")
    table=$(echo $t | sed -e "s/^.\+\.//")
    if [[ ! " ${FOUND_SCHEMA[*]} " =~ " ${schema} " ]]; then
        #printf "DROP SCHEMA $schema;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
        printf "CREATE SCHEMA IF NOT EXISTS $schema;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
        printf "GRANT ALL ON SCHEMA $schema TO postgres;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
        printf "GRANT ALL ON SCHEMA $schema TO $schema;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
        printf "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n" >> /tmp/${WORKFLOW}-drop-tables.sql
        FOUND_SCHEMA+=(${schema})
    fi
    printf "DROP TABLE IF EXISTS ${schema}.${table} CASCADE;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
done
psql -f /tmp/${WORKFLOW}-drop-tables.sql -d ${TMP_DATABASE}
