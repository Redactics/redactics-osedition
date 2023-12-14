#!/bin/bash

set -exo pipefail

WORKFLOW=$1
SCHEMA=$2

/scripts/prep-certs.sh

PSQL="psql --quiet --tuples-only --no-align"

# generate DDL to restore sequences which needs to be done in advance of remaining DDL
pg_dump --schema=${SCHEMA} -s -O -x | awk '/[CREATE|ALTER] SEQUENCE/ {print}' FS="\n" RS="" | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}-sequences.sql

$PSQL -c "SELECT generate_sequences('${SCHEMA}');" | curl -X POST -H "Transfer-Encoding: chunked" -s -f -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}-set-sequences.sql