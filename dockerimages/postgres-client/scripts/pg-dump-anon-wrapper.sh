#!/bin/bash

set -exo pipefail

WORKFLOW=$1

/scripts/prep-certs.sh

# outputs complete anon-dump of entire database
/scripts/pg-dump-anon.sh | curl -X POST -H "Transfer-Encoding: chunked" -s -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fcomplete-dump.sql