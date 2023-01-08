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
AGENT_UUID = os.environ['AGENT_UUID']
AGENT_VERSION = os.environ['AGENT_VERSION']
API_URL = os.environ['API_URL']

headers = {'Content-type': 'application/json'}
data = {'agentVersion': AGENT_VERSION}
apiUrl = API_URL + "/agent/" + AGENT_UUID + "/heartbeat"

# create lockfile
if not path.exists("/tmp/redactics-heartbeat"):
  r = requests.put(apiUrl, data=json.dumps(data), headers=headers)
  response = json.loads(r.text)
  print(response)
  if "uuid" in response:
    f = open("/tmp/redactics-heartbeat","w+")