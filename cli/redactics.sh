#!/bin/bash

COMMAND=$1
bold=$(tput bold)
normal=$(tput sgr0)

usage()
{
  printf 'Usage: %s [-h|--help] <command>\n\n' "$0"
  printf '%s\n\n' "Redactics Agent possible commands:"
  printf '%s\n' "- ${bold}list-snapshots"
  printf '%s\n\n' "  ${normal}lists all available volume snapshots"
  printf '%s\n' "- ${bold}create-snapshot [snapshot name] [helm DB name]"
  printf '%s\n\n' "  ${normal}creates snapshot [snapshot name] for helm database [helm DB name] (the Helm database name is the helm installation name viewable via helm ls)"
  printf '%s\n' "- ${bold}delete-snapshot [snapshot name]"
  printf '%s\n\n' "  ${normal}deletes snapshot [snapshot name]"
  printf '%s\n' "- ${bold}create-database [DB name] [snapshot name] [helm DB name] [landing DB name]"
  printf '%s\n\n' "  ${normal}creates database [DB name] from [snapshot name] for  helm database [helm DB name] running landing database [landing DB name] (the Helm database name is the helm installation name viewable via helm ls, the landing DB name is the Postgres database name)"
  printf '%s\n' "- ${bold}delete-database [DB name] [--retain-disk]"
  printf '%s\n\n' "  ${normal}deletes database [DB name] and optionally retains the disk to reuse this data later (requires an identically named database)"
  printf '%s\n' "- ${bold}list-exports [workflow ID]"
  printf '%s\n\n' "  ${normal}lists all exported files exported from [workflow ID]"
  printf '%s\n' "- ${bold}download-export [workflow ID] [filename]"
  printf '%s\n\n' "  ${normal}downloads [filename] exported by [workflow ID] to local directory"
  printf '%s\n' "- ${bold}list-runs [workflow ID]"
  printf '%s\n\n' "  ${normal}lists all workflow runs for [workflow ID]"
  printf '%s\n' "- ${bold}start-workflow [workflow ID]"
  printf '%s\n\n' "  ${normal}starts new workflow run for provided [workflow ID]"
  printf '%s\n' "- ${bold}install-sample-table [connection ID] [sample table]"
  printf '%s\n' "  ${normal}installs a collection of sample tables using the authentication info provided for [workflow ID] and [connection ID]"
  printf '%s\n\n' "  [Sample table] options include: athletes, marketing_campaign, [connection ID] is the connection ID from your Helm configuration file"
  printf '%s\n' "- ${bold}test-requirements"
  printf '%s\n\n' "  ${normal}tests for presence of volume snapshot manifests and valid RBAC permissions required for this CLI"
  printf '%s\n' "- ${bold}output-diagostics"
  printf '%s\n\n' "  ${normal}creates a folder called \"redactics-diagnostics\" containing files useful to assist with troubleshooting agent issues"
  printf '%s\n' "  (this excludes sensitive information such as your Helm config file or the contents of your Kubernetes secrets)"
  printf '%s\n' "- ${bold}version"
  printf '%s\n\n' "  ${normal}outputs Redactics Agent CLI version"
  printf '%s\n' "- ${bold}-h, --help"
  printf '%s\n' "  ${normal}prints help"
}

NAMESPACE=
AGENT_SCHEDULER=
AGENT_HTTP_NAS=
VERSION=3.1.0
KUBECTL=$(which kubectl)
HELM=$(which helm)
DOCKER_COMPOSE=$(which docker-compose)

function get_namespace {
  NAMESPACE=$($HELM ls --all-namespaces | grep agent | grep agent | awk '{print $2}')
  if [[ -z "$NAMESPACE" ]]; then
    printf "ERROR: Redactics does not appeared to be installed on the Kubernetes cluster you are currently authenticated to. Please re-install Redactics using the command provided within the \"Agents\" section of the Redactics dashboard\n"
    exit 1
  fi
}

function verify_helm_db {
  $HELM -n $NAMESPACE ls | awk '{print $1}' | grep -e "^${1}$" > /dev/null
  if [ $? -ne 0 ]; then
    POSSIBLE_DBS=$($HELM -n $NAMESPACE ls | tail -n +2 | awk '{print $1}' | grep -v 'agent')
    printf "${bold}ERROR: the database $1 could not be found. Your available databases are:${normal}\n$POSSIBLE_DBS\n"
    exit 1
  fi
}

function get_agent_scheduler {
  if [[ -z "$NAMESPACE" ]]; then
    get_namespace
  fi
  AGENT_SCHEDULER=$($KUBECTL -n $NAMESPACE get pods | grep agent-scheduler | grep Running | grep 2/2 | awk '{print $1}')
  if [[ -z "$AGENT_SCHEDULER" ]]; then
    printf "ERROR: the redactics scheduler pod cannot be found in the \"${NAMESPACE}\" Kubernetes namespace, or else it is not in a \"Running\" state ready to receive commands.\nTo correct this problem, if this pod is missing from your \"kubectl get pods -n ${NAMESPACE}\" output try reinstalling the Redactics agent.\nIf it is installed but not marked as running, please check for errors in the notification center (i.e. the notification bell) in your Redactics dashboard\nor else contact Redactics support for help (support@redactics.com)\n"
    exit 1
  fi
}

function get_agent_http_nas {
  if [[ -z "$NAMESPACE" ]]; then
    get_namespace
  fi
  AGENT_HTTP_NAS=$($KUBECTL -n $NAMESPACE get pods | grep agent-http-nas | grep Running | grep 1/1 | awk '{print $1}')
  if [[ -z "$AGENT_HTTP_NAS" ]]; then
    printf "ERROR: the redactics http nas pod cannot be found in the \"${NAMESPACE}\" Kubernetes namespace, or else it is not in a \"Running\" state ready to receive commands.\nTo correct this problem, if this pod is missing from your \"kubectl get pods -n ${NAMESPACE}\" output try reinstalling the Redactics agent.\nIf it is installed but not marked as running, please check for errors in the notification center (i.e. the notification bell) in your Redactics dashboard\nor else contact Redactics support for help (support@redactics.com)\n"
    exit 1
  fi
}

function gen_downloader {
  read -r -d '' DOWNLOADER <<- EOM
version: '3.7'
services: 
  downloader:
    image: amazon/aws-cli:2.4.2
    environment:
      S3_BUCKET: ${BUCKET}
    volumes:
      - ${HOME}/.aws/credentials:/root/.aws/credentials
      - /tmp/redactics-datasets:/tmp/redactics-datasets
EOM
  echo "$DOWNLOADER" > docker-compose-redactics.yml
}

function gen_install_dataset {
  read -r -d '' INSTALL_DATASET <<- EOM
#!/bin/bash

set -x

WORKFLOW=\$1
REVISION=\$2

mkdir -p /tmp/redactics-datasets
docker-compose -f docker-compose-redactics.yml run downloader s3 cp --recursive ${BUCKET}/\${WORKFLOW}/\${REVISION}/ /tmp/redactics-datasets
csv_files=()
schema_files=()
for i in /tmp/redactics-datasets/table-*.csv; do
  csv_file=\`basename \$i\`
  csv_files+=(\$csv_file)
  table=\`echo \$csv_file | sed 's/^table-//' | sed 's/.csv$//'\`
  docker-compose run -e PGHOST=${PGSERVICE} -e PGUSER=${PGUSER} -e PGPASSWORD=${PGPASS} -e PGDATABASE=${PGDATABASE} ${PGSERVICE} psql -c "DROP TABLE IF EXISTS \${table} CASCADE"
done
for i in /tmp/redactics-datasets/schema-*.sql; do
  sql_file=\`basename \$i\`
  docker-compose run -e PGHOST=${PGSERVICE} -e PGUSER=${PGUSER} -e PGPASSWORD=${PGPASS} -v /tmp/redactics-datasets:/tmp/redactics-datasets ${PGSERVICE} psql -d ${PGDATABASE} -f "/tmp/redactics-datasets/\$sql_file"
done
for csv_file in "\${csv_files[@]}"; do
  table=\`echo \$csv_file | sed 's/^table-//' | sed 's/.csv$//'\`
  docker-compose run -e PGHOST=${PGSERVICE} -e PGUSER=${PGUSER} -e PGPASSWORD=${PGPASS} -e PGDATABASE=${PGDATABASE} -v /tmp/redactics-datasets:/tmp/redactics-datasets ${PGSERVICE} psql -c "\copy \$table FROM '/tmp/redactics-datasets/\${csv_file}' DELIMITER ',' csv header"
done

if [ -f redactics-datacleanup.sql ]; then
  cp ./redactics-datacleanup.sql /tmp/redactics-datacleanup.sql
  docker-compose run -e PGHOST=${PGSERVICE} -e PGUSER=${PGUSER} -e PGPASSWORD=${PGPASS} -e PGDATABASE=${PGDATABASE} -v /tmp/redactics-datacleanup.sql:/redactics-datacleanup.sql ${PGSERVICE} psql -f /redactics-datacleanup.sql
  rm /tmp/redactics-datacleanup.sql
fi
rm -rf /tmp/redactics-datasets
EOM

  echo "$INSTALL_DATASET" > install-redactics-dataset.sh
}

# generate warnings about missing helm and kubectl commands
if [[ -z "$KUBECTL" ]]; then
  printf "ERROR: kubectl command missing from your shell path. The Redactics Agent CLI requires your kubectl command be accessible\n"
  exit 1
elif [[ -z "$HELM" ]]; then
  printf "ERROR: helm command missing from your shell path. The Redactics Agent CLI requires the helm command to determine which Kubernetes namespace hosts your Redactics Agent\n"
  exit 1
fi

case "$1" in

list-snapshots)
  get_namespace
  $KUBECTL -n $NAMESPACE get volumesnapshots
  ;;

create-snapshot)
  SNAPSHOT_NAME=$2
  HELM_DB_NAME=$3
  if [ -z $SNAPSHOT_NAME ] || [ -z $HELM_DB_NAME ]
  then
    usage
    exit 1
  fi
  get_namespace
  verify_helm_db $HELM_DB_NAME
  read -r -d '' MANIFEST <<- EOM
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: $SNAPSHOT_NAME
spec:
  volumeSnapshotClassName: redactics-aws-snapshot
  source:
    persistentVolumeClaimName: data-${HELM_DB_NAME}-postgresql-0
EOM
  printf "$MANIFEST" | $KUBECTL apply -n $NAMESPACE -f -
  printf "Your snapshot has been created. To monitor its availability:\n\n${bold}$KUBECTL -n $NAMESPACE get volumesnapshot\n"
  ;;

delete-snapshot)
  SNAPSHOT_NAME=$2
  if [ -z $SNAPSHOT_NAME ]
  then
    usage
    exit 1
  fi
  get_namespace
  $KUBECTL -n $NAMESPACE get volumesnapshot $SNAPSHOT_NAME > /dev/null
  if [ $? -ne 0 ]; then
    printf "${bold}ERROR: invalid snapshot name $SNAPSHOT_NAME. You can view your available snapshots by running:${normal}\n$KUBECTL -n $NAMESPACE get volumesnapshots\n"
    exit 1
  fi
  $KUBECTL -n $NAMESPACE delete volumesnapshot $SNAPSHOT_NAME
  ;;

create-database)
  DB_NAME=$2
  SNAPSHOT_NAME=$3
  HELM_DB_NAME=$4
  LANDING_DB_NAME=$5
  # TODO: get landing DB name from Airflow var?
  if [ -z $SNAPSHOT_NAME ] || [ -z $HELM_DB_NAME ] || [ -z $LANDING_DB_NAME ] || [ -z $DB_NAME ]
  then
    usage
    exit 1
  fi
  # TODO: DB name should not contain spaces
  # TODO: DB name should be unique
  get_namespace
  # get disk size
  DISK_SIZE=$($KUBECTL -n $NAMESPACE get pvc data-${HELM_DB_NAME}-postgresql-0 | tail -n +2 | awk '{print $4}')
  $HELM -n $NAMESPACE upgrade --install \
    --set "redactics.dbname=${LANDING_DB_NAME}" \
    --set "primary.persistence.size=${DISK_SIZE}" \
    --set "primary.persistence.storageClass=ebs-sc" \
    --set "primary.persistence.dataSource.name=${SNAPSHOT_NAME}" \
    --set "primary.persistence.dataSource.kind=VolumeSnapshot" \
    --set "primary.persistence.dataSource.apiGroup=snapshot.storage.k8s.io" \
    ${DB_NAME} redactics/postgresql
  ;;

delete-database)
  DB_NAME=$2
  RETAIN_DISK=$3
  if [ -z $DB_NAME ]
  then
    usage
    exit 1
  fi
  get_namespace
  verify_helm_db $DB_NAME
  if [ -z $RETAIN_DISK ]
  then
    # get PVC
    PVC=$($KUBECTL -n $NAMESPACE describe po ${DB_NAME}-postgresql-0 | grep ClaimName | awk '{print $2}')
    $HELM uninstall $DB_NAME
    $KUBECTL -n $NAMESPACE delete pvc $PVC
  elif [ $RETAIN_DISK = "--retain-disk" ]
  then
    $HELM uninstall $DB_NAME
  else
    usage
  fi
  ;;

list-exports)
  WORKFLOW=$2
  if [ -z $WORKFLOW ]
  then
    usage
    exit 1
  fi
  get_namespace
  get_agent_http_nas
  $KUBECTL -n $NAMESPACE exec -it $AGENT_HTTP_NAS -- curl "http://localhost:3000/file/${WORKFLOW}"
  ;;

download-export)
  WORKFLOW=$2
  DOWNLOAD=$3
  if [ -z $WORKFLOW ] || [ -z $DOWNLOAD ]
  then
    usage
    exit 1
  fi
  get_namespace
  get_agent_http_nas
  $KUBECTL -n $NAMESPACE cp ${AGENT_HTTP_NAS}:/mnt/storage/${WORKFLOW}/${DOWNLOAD} $DOWNLOAD
  printf "${DOWNLOAD} HAS BEEN DOWNLOADED TO YOUR LOCAL DIRECTORY\n"
  ;;

list-runs)
  WORKFLOW=$2
  if [ -z $WORKFLOW ]
  then
    usage
    exit 1
  fi
  get_namespace
  get_agent_scheduler
  $KUBECTL -n $NAMESPACE -c scheduler exec $AGENT_SCHEDULER -- bash -c "airflow dags list-runs -d $WORKFLOW | grep -A 31 \"dag_id\""
  ;;

start-workflow)
  WORKFLOW=$2
  if [ -z $WORKFLOW ]
  then
    usage
    exit 1
  fi
  get_namespace
  get_agent_scheduler
  $KUBECTL -n $NAMESPACE -c scheduler exec $AGENT_SCHEDULER -- bash -c "airflow dags trigger $WORKFLOW"
  if [ $? == 0 ]
  then
    printf "${bold}YOUR JOB HAS BEEN QUEUED!\n\n${normal}To track progress, enter ${bold}redactics list-runs ${WORKFLOW}${normal} or visit the ${bold}Workflow Jobs${normal} section of your Redactics account.\nErrors will be reported to your Redactics dashboard\n"
  fi
  ;;

install-sample-table)
  CONN_ID=$2
  SAMPLE_TABLE=$3
  if [ -z $SAMPLE_TABLE ] || [ -z $CONN_ID ]
  then
    usage
    exit 1
  fi
  if [ $SAMPLE_TABLE != "athletes" ] && [ $SAMPLE_TABLE != "marketing_campaign" ]
  then
    printf "sample table needs to be one of \"athletes\" or \"marketing_campaign\"\n"
    exit 1
  fi
  get_namespace

  # confirm table creation
  printf "${bold}This command will install the tables \"$SAMPLE_TABLE\" into the database provided within your Helm config file corresponding to connection ID $CONN_ID\n${normal}(check your Redactics account to determine the path where this file is installed on your workstation, it is usually ~/.redactics/values.yaml).\n\nBefore installation this command will drop any existing tables called ${bold}$SAMPLE_TABLE${normal}, so if you happen to have a table you have created yourself with this same name,\nyou'll want to try installing another sample database.\n\nEnter \"yes\" to confirm installation of this table\n\n"
  read -r confirm
  if [ $confirm != "yes" ]
  then
    exit 0
  fi

  get_agent_scheduler
  JSON="'{\"input\": \"${CONN_ID}\"}'"
  $KUBECTL -n $NAMESPACE -c scheduler exec $AGENT_SCHEDULER -- bash -c "airflow dags trigger -c $JSON sampletable-${SAMPLE_TABLE}"
  if [ $? == 0 ]
  then
    printf "${bold}YOUR TABLE INSTALLATION HAS BEEN QUEUED!\n\n${normal}To track progress, enter ${bold}redactics list-runs sampletable-${SAMPLE_TABLE}${normal} or visit the ${bold}Workflow Jobs${normal} section of your Redactics account.\nBoth the results and any errors will be reported to your Redactics account\n"
  fi
  ;;

test-requirements)
  $KUBECTL -n kube-system get serviceaccount snapshot-controller > /dev/null
  if [ $? -ne 0 ]; then
    exit 1
  fi
  $KUBECTL -n kube-system get deploy snapshot-controller > /dev/null
  if [ $? -ne 0 ]; then
    exit 1
  fi
  $KUBECTL -n kube-system get crd volumesnapshotclasses.snapshot.storage.k8s.io > /dev/null
  if [ $? -ne 0 ]; then
    exit 1
  fi
  $KUBECTL -n kube-system get crd volumesnapshotcontents.snapshot.storage.k8s.io > /dev/null
  if [ $? -ne 0 ]; then
    exit 1
  fi
  $KUBECTL -n kube-system get crd volumesnapshots.snapshot.storage.k8s.io > /dev/null
  if [ $? -ne 0 ]; then
    exit 1
  fi
  $KUBECTL get storageclass ebs-sc > /dev/null
  if [ $? -ne 0 ]; then
    exit 1
  fi
  $KUBECTL get volumesnapshotclass redactics-aws-snapshot > /dev/null
  if [ $? -ne 0 ]; then
    exit 1
  fi
  printf "All requirements checks have passed, you are good to go!\n"
  ;;

output-diagnostics)
  get_namespace
  get_agent_scheduler
  OUTPUT_FOLDER=redactics-diagnostics
  rm -rf $OUTPUT_FOLDER || true
  mkdir $OUTPUT_FOLDER
  localenv=$'KUBECTL: '
  localenv+=$($KUBECTL version)
  localenv+=$'\nHELM: '
  localenv+=$($HELM version)
  localenv+=$'\nREDACTICS CLI VERSION: '
  localenv+=$(echo $VERSION)
  localenv+=$'\nDETECTED KUBERNETES NAMESPACE: '
  localenv+=$(echo $NAMESPACE)
  localenv+=$'\nSCHEDULER POD: '
  localenv+=$(echo $AGENT_SCHEDULER)
  printf "$localenv" > ${OUTPUT_FOLDER}/env.log
  $HELM ls --all-namespaces > ${OUTPUT_FOLDER}/helm.log
  $KUBECTL -n $NAMESPACE get pods > ${OUTPUT_FOLDER}/pods.log
  $KUBECTL -n $NAMESPACE get pv > ${OUTPUT_FOLDER}/pv.log
  $KUBECTL -n $NAMESPACE get pvc > ${OUTPUT_FOLDER}/pvc.log
  $KUBECTL -n $NAMESPACE get secret > ${OUTPUT_FOLDER}/secret-listing.log
  $KUBECTL -n $NAMESPACE logs -l app.kubernetes.io/name=http-nas --tail=-1 > ${OUTPUT_FOLDER}/http-nas.log
  $KUBECTL -n $NAMESPACE -c scheduler logs -l component=scheduler --tail=-1 > ${OUTPUT_FOLDER}/scheduler.log
  $KUBECTL -n $NAMESPACE -c scheduler cp $AGENT_SCHEDULER:/opt/airflow/logs ${OUTPUT_FOLDER}/airflow-logs
  printf "A folder called \"$OUTPUT_FOLDER\" has been created. Please zip this folder and send it to Redactics support for assistance with troubleshooting Redactics Agent issues\n"
  ;;

version)
  printf "$VERSION (visit your Redactics Dashboard to check on version updates)\n"
  ;;

-h|--help)
  usage
  exit 0
  ;;
*)
  usage
  exit 0
  ;;
esac
