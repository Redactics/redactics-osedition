#!/bin/bash

set -exo pipefail

WORKFLOW=$1
SCHEMA=$2
SEQEUNCE_CMDS=$3

/scripts/prep-certs.sh

PSQL="psql --quiet --tuples-only --no-align"

# generate DDL to restore sequences which needs to be done in advance of remaining DDL
pg_dump --schema=${SCHEMA} -s -O -x | awk '/[CREATE|ALTER] SEQUENCE/ {print}' FS="\n" RS="" | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}-sequences.sql

# Nulogy patch for setting sequences
if [ -z "$SEQUENCE_CMDS" ]
then
    echo $SEQEUNCE_CMDS | curl -X POST -H "Transfer-Encoding: chunked" -s -f -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}-set-sequences.sql
fi