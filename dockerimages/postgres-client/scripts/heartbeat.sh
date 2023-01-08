#!/bin/bash

set -exo pipefail

if [ $ENV == "development" ]
then
  API_URL=http://host.docker.internal:3000
else
  API_URL=https://api.redactics.com
fi

curl -H "x-api-key: ${API_KEY}" -X PUT -s ${API_URL}/cluster/${CLUSTER_UUID}/heartbeat
