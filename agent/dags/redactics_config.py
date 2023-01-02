import json
import os
import base64

def parse(dag_name):
  WORKFLOWS = os.environ['WORKFLOWS']
  workflows_json = json.loads(base64.b64decode(WORKFLOWS))

  # find rules for DB belonging to this DAG
  dag_db = {}
  for db in workflows_json:
      for dbkey, dbval in db.items():
          if dbkey == "id" and dbval == dag_name:
              dag_db = db

  return dag_db