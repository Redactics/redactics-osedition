#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TMP_DATABASE=$2
TABLE=$3

/scripts/prep-certs.sh

if [ -z $TABLE ]
then
    curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fpgdump | pg_restore -O -d ${TMP_DATABASE}
else
    curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fpgdump-${TABLE} | pg_restore -O -d ${TMP_DATABASE}
fi