#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TMP_DATABASE=$2
TABLES=$3

/scripts/prep-certs.sh

# add commands to clean all tables and foreign key constraints
rm /tmp/${WORKFLOW}-drop-tables.sql || true
IFS=', ' read -r -a tables <<< "$TABLES"
for t in "${tables[@]}"
do
    echo "Creating SQL to clean table $t"
    schema=$(echo $t | sed -e "s/\..\+$//")
    table=$(echo $t | sed -e "s/^.\+\.//")
    printf "DROP SCHEMA $schema;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
    printf "CREATE SCHEMA $schema;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
    printf "GRANT ALL ON SCHEMA $schema TO postgres;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
    printf "GRANT ALL ON SCHEMA $schema TO $schema;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
    printf "DROP TABLE IF EXISTS ${schema}.${table} CASCADE;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
done
psql -f /tmp/${WORKFLOW}-drop-tables.sql -d ${TMP_DATABASE}
