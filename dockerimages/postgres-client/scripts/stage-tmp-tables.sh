#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TABLES=$2

/scripts/prep-certs.sh

IFS=',' read -r -a tables <<< "$TABLES"
for table in "${tables[@]}"
do
    echo "Move table $table into schema $WORKFLOW"
    #psql -c "ALTER TABLE $table SET SCHEMA \"$WORKFLOW\""
done
