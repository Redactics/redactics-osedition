#!/bin/bash

set -exo pipefail

SQL=$1
EMAIL=$2
WORKFLOW=$3

echo "${SQL}" | curl -X POST -H "Transfer-Encoding: chunked" -s -d @- http://agent-http-nas:3000/file/${WORKFLOW}%2Fforgetuser-queries-${EMAIL}.sql