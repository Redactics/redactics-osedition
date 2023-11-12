#!/bin/bash

set -exo pipefail

WORKFLOW=$1
INPUT=$2

/scripts/prep-certs.sh

curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Finput-${INPUT}-restore-constraints.sql | psql