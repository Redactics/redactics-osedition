#!/bin/bash

if [ $ENV == "development" ]
then
  API_URL=http://host.docker.internal:3000
fi

if [ "$AGENT_UUID" != "<nil>" ]; then
  curl -s -H "Content-Type: application/json" -d "{\"helmCmd\": \"${HELM_CMD}\", \"agentVersion\": \"${AGENT_VERSION}\"}" -X PUT ${API_URL}/agent/${AGENT_UUID}/heartbeat
fi
