#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TABLE=$2

/scripts/prep-certs.sh

pg_dump -a -O -Fc -x -v -t $TABLE | curl -X POST -H "Transfer-Encoding: chunked" -s -f -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fpgdump-${TABLE}