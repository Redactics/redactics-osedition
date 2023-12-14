#!/bin/bash

set -exo pipefail

WORKFLOW=$1
SCHEMA=$2

/scripts/prep-certs.sh

curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}-drop-constraints.sql | psql