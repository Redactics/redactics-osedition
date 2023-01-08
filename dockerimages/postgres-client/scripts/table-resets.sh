#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TMP_DATABASE=$2
TABLES=$3

/scripts/prep-certs.sh

# add commands to clean all tables and foreign key constraints
rm /tmp/${WORKFLOW}-drop-tables.sql || true
IFS=', ' read -r -a tables <<< "$TABLES"
for table in "${tables[@]}"
do
    echo "Creating SQL to clean table $table"
    printf "DROP TABLE IF EXISTS $table CASCADE;\n" >> /tmp/${WORKFLOW}-drop-tables.sql
done
psql -f /tmp/${WORKFLOW}-drop-tables.sql -d ${TMP_DATABASE}
