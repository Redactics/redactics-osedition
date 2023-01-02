from datetime import timedelta
from urllib.parse import urlparse

import json
import os
import requests
import base64
import airflow
from airflow import DAG
from os import path

ENV = os.environ['ENV']
CLUSTER_UUID = os.environ['CLUSTER_UUID']
API_KEY = os.environ['API_KEY']
AGENT_VERSION = os.environ['AGENT_VERSION']

API_HOST = "http://host.docker.internal:3000" if ENV == "development" else "https://api.redactics.com"
headers = {'Content-type': 'application/json', 'Accept': 'text/plain', 'x-api-key': API_KEY}
data = {'agentVersion': AGENT_VERSION}
apiUrl = API_HOST + "/cluster/" + CLUSTER_UUID + "/heartbeat"

# create lockfile
if not path.exists("/tmp/redactics-heartbeat"):
  r = requests.put(apiUrl, data=json.dumps(data), headers=headers)
  response = json.loads(r.text)
  print(response)
  if "uuid" in response:
    f = open("/tmp/redactics-heartbeat","w+")