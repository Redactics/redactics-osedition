#!/bin/bash

if [ $ENV == "development" ]
then
  API_URL=http://host.docker.internal:3000
else
  API_URL=http://redactics-api
fi

curl -H "Content-Type: application/json" -d "{\"helmCmd\": \"${HELM_CMD}\", \"agentVersion\": \"${AGENT_VERSION}\"}" -X PUT ${API_URL}/agent/${AGENT_UUID}/heartbeat
