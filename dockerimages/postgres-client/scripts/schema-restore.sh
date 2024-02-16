#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TARGET_DATABASE=$2
SCHEMA=$3

/scripts/prep-certs.sh

echo "Restoring SQL for schema $SCHEMA"

curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}.sql | psql -d ${TARGET_DATABASE}
