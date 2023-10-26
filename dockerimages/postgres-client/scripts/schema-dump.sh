#!/bin/bash

set -exo pipefail

WORKFLOW=$1
SCHEMA=$2

/scripts/prep-certs.sh

echo "Creating SQL for schema $SCHEMA"
# if [ "${SCHEMA}" != "public" ]
# then
#     # copy public as well to restore assets that might not have been imported into custom schema
#     pg_dump --schema=public --schema=${SCHEMA} -s -O -x -v | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}.sql
# else
#     pg_dump --schema=${SCHEMA} -s -O -x -v | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}.sql
# fi
pg_dump --schema=${SCHEMA} -s -O -x -v | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}.sql