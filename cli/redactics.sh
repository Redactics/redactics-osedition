#!/bin/bash

COMMAND=$1
bold=$(tput bold)
normal=$(tput sgr0)

usage()
{
  printf 'Usage: %s [-h|--help] <command>\n\n' "$0"
  printf '%s\n\n' "Redactics SMART Agent possible commands:"
  printf '%s\n' "- ${bold}list-exports [workflow ID]"
  printf '%s\n\n' "  ${normal}lists all exported files exported from [workflow ID]"
  printf '%s\n' "- ${bold}download-export [workflow ID] [filename]"
  printf '%s\n\n' "  ${normal}downloads [filename] exported by [workflow ID] to local directory"
  printf '%s\n' "- ${bold}list-runs [workflow ID]"
  printf '%s\n\n' "  ${normal}lists all workflow runs for [workflow ID]"
  printf '%s\n' "- ${bold}start-workflow [workflow ID]"
  printf '%s\n\n' "  ${normal}starts new workflow run for provided [workflow ID]"
  printf '%s\n' "- ${bold}start-scan [workflow ID] (FREE EDITION)"
  printf '%s\n\n' "  ${normal}starts new PII scan for provided [workflow ID])"
  printf '%s\n' "- ${bold}init-postgres-datarepo [S3 bucket URL] [docker-compose postgres service name] [postgres user] [postgres pass] [postgres DB] (FREE EDITION)"
  printf '%s\n\n' "  ${normal}creates a bash script in local directory for installing datasets from your internal data repository"
  printf '%s\n' "- ${bold}install-postgres-dataset [workflow ID] [revision ID] (FREE EDITION)"
  printf '%s\n\n' "  ${normal}installs dataset of provided revision ID to your local postgres database"
  printf '%s\n' "- ${bold}install-sample-table [connection ID] [sample table]"
  printf '%s\n' "  ${normal}installs a collection of sample tables using the authentication info provided for [workflow ID] and [connection ID]"
  printf '%s\n\n' "  [Sample table] options include: athletes, marketing_campaign, [connection ID] is the connection ID from your Helm configuration file"
  printf '%s\n' "- ${bold}output-diagostics"
  printf '%s\n' "  ${normal}creates a folder called \"redactics-diagnostics\" containing files useful to assist with troubleshooting agent issues"
  printf '%s\n\n' "  (this excludes sensitive information such as your Helm config file or the contents of your Kubernetes secrets)"
  printf '%s\n' "- ${bold}version"
  printf '%s\n\n' "  ${normal}outputs Redactics SMART Agent CLI version"
  printf '%s\n' "- ${bold}-h, --help"
  printf '%s\n' "  ${normal}prints help"
}

NAMESPACE=
REDACTICS_SCHEDULER=
REDACTICS_HTTP_NAS=
VERSION=2.4.0
KUBECTL=$(which kubectl)
HELM=$(which helm)
DOCKER_COMPOSE=$(which docker-compose)

function get_namespace {
  NAMESPACE=$(helm ls --all-namespaces | grep agent | grep agent | awk '{print $2}')
  if [[ -z "$NAMESPACE" ]]; then
    printf "ERROR: Redactics does not appeared to be installed on the Kubernetes cluster you are currently authenticated to. Please re-install Redactics using the command provided within the \"SMART Agents\" section of your Redactics account\n"
    exit 1
  fi
}

function get_redactics_scheduler {
  if [[ -z "$NAMESPACE" ]]; then
    get_namespace
  fi
  REDACTICS_SCHEDULER=$($KUBECTL -n $NAMESPACE get pods | grep agent-scheduler | grep Running | grep 2/2 | awk '{print $1}')
  if [[ -z "$REDACTICS_SCHEDULER" ]]; then
    printf "ERROR: the redactics scheduler pod cannot be found in the \"${NAMESPACE}\" Kubernetes namespace, or else it is not in a \"Running\" state ready to receive commands.\nTo correct this problem, if this pod is missing from your \"kubectl get pods -n ${NAMESPACE}\" output try reinstalling the Redactics agent.\nIf it is installed but not marked as running, please check for errors in the notification center (i.e. the notification bell) at https://app.redactics.com\nor else contact Redactics support for help (support@redactics.com)\n"
    exit 1
  fi
}

function get_redactics_http_nas {
  if [[ -z "$NAMESPACE" ]]; then
    get_namespace
  fi
  REDACTICS_HTTP_NAS=$($KUBECTL -n $NAMESPACE get pods | grep agent-http-nas | grep Running | grep 1/1 | awk '{print $1}')
  if [[ -z "$REDACTICS_HTTP_NAS" ]]; then
    printf "ERROR: the redactics http nas pod cannot be found in the \"${NAMESPACE}\" Kubernetes namespace, or else it is not in a \"Running\" state ready to receive commands.\nTo correct this problem, if this pod is missing from your \"kubectl get pods -n ${NAMESPACE}\" output try reinstalling the Redactics agent.\nIf it is installed but not marked as running, please check for errors in the notification center (i.e. the notification bell) at https://app.redactics.com\nor else contact Redactics support for help (support@redactics.com)\n"
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
  printf "ERROR: kubectl command missing from your shell path. The Redactics SMART Agent CLI requires your kubectl command be accessible\n"
  exit 1
elif [[ -z "$HELM" ]]; then
  printf "ERROR: helm command missing from your shell path. The Redactics SMART Agent CLI requires the helm command to determine which Kubernetes namespace hosts your Redactics SMART Agent\n"
  exit 1
fi

case "$1" in

list-exports)
  WORKFLOW=$2
  if [ -z $WORKFLOW ]
  then
    usage
    exit 1
  fi
  get_namespace
  get_redactics_http_nas
  $KUBECTL -n $NAMESPACE exec -it $REDACTICS_HTTP_NAS -- curl "http://localhost:3000/file/${WORKFLOW}"
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
  get_redactics_http_nas
  $KUBECTL -n $NAMESPACE cp ${REDACTICS_HTTP_NAS}:/mnt/storage/${WORKFLOW}/${DOWNLOAD} $DOWNLOAD
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
  get_redactics_scheduler
  $KUBECTL -n $NAMESPACE -c scheduler exec $REDACTICS_SCHEDULER -- bash -c "airflow dags list-runs -d $WORKFLOW | grep -A 31 \"dag_id\""
  ;;

start-workflow)
  WORKFLOW=$2
  if [ -z $WORKFLOW ]
  then
    usage
    exit 1
  fi
  get_namespace
  get_redactics_scheduler
  $KUBECTL -n $NAMESPACE -c scheduler exec $REDACTICS_SCHEDULER -- bash -c "airflow dags trigger $WORKFLOW"
  if [ $? == 0 ]
  then
    printf "${bold}YOUR JOB HAS BEEN QUEUED!\n\n${normal}To track progress, enter ${bold}redactics list-runs ${WORKFLOW}${normal} or visit the ${bold}Workflow Jobs${normal} section of your Redactics account.\nErrors will be reported to your Redactics account (https://app.redactics.com)\n"
  fi
  ;;

start-scan)
  WORKFLOW=$2
  if [ -z $WORKFLOW ]
  then
    usage
    exit 1
  fi
  get_namespace
  get_redactics_scheduler
  $KUBECTL -n $NAMESPACE -c scheduler exec $REDACTICS_SCHEDULER -- bash -c "airflow dags trigger ${WORKFLOW}-scanner"
  if [ $? == 0 ]
  then
    printf "${bold}YOUR SCAN HAS BEEN QUEUED!\n\n${normal}To track progress, enter ${bold}redactics list-runs ${WORKFLOW}-scanner${normal}\nBoth the results and any errors will be reported to your Redactics account (https://app.redactics.com/usecases/piiscanner)\n"
  fi
  ;;

init-postgres-datarepo)
  BUCKET=$2
  PGSERVICE=$3
  PGUSER=$4
  PGPASS=$5
  PGDATABASE=$6
  if [ -z $BUCKET ] || [ -z $PGSERVICE ] || [ -z $PGUSER ] || [ -z $PGPASS ] || [ -z $PGDATABASE ]
  then
    usage
    exit 1
  fi
  # validate bucket URL
  valid_bucket=true
  if ! [[ $BUCKET =~ ^s3:\/\/ ]]; then
    # missing prefix
    valid_bucket=false
  elif ! [[ $BUCKET =~ ^s3:\/\/[a-zA-Z0-9]{1}[a-zA-Z0-9.-]{1,61}[a-zA-Z0-9]{1}$ ]]; then
    # invalid name
    valid_bucket=false
  elif [[ $BUCKET =~ ^s3:\/\/[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}$ ]]; then
    # IP address
    valid_bucket=false
  elif [[ $BUCKET =~ ^s3:\/\/xn-- ]] || [[ $BUCKET =~ s3:\/\/.*-s3alias$ ]]; then
    # other forbidden names
    valid_bucket=false
  fi

  if [[ "$valid_bucket" = false ]]; then
    printf "ERROR: invalid S3 bucket URL, buckets must be prefaced by ${bold}s3:// ${normal}and abide by these conventions:\nhttps://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html\n"
    exit 1
  fi

  gen_downloader
  gen_install_dataset
  chmod +x install-redactics-dataset.sh
  ;;

install-postgres-dataset)
  WORKFLOW=$2
  REVISION=$3
  if [ -z $WORKFLOW ] || [ -z $REVISION ]
  then
    usage
    exit 1
  fi
  # validate docker-compose presence
  if [[ -z "$DOCKER_COMPOSE" ]]; then
    printf "ERROR: docker-compose command missing from your shell path. This feature requires your docker-compose command be accessible\n"
    exit 1
  fi

  ./install-redactics-dataset.sh $WORKFLOW $REVISION
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

  get_redactics_scheduler
  JSON="'{\"input\": \"${CONN_ID}\"}'"
  $KUBECTL -n $NAMESPACE -c scheduler exec $REDACTICS_SCHEDULER -- bash -c "airflow dags trigger -c $JSON sampletable-${SAMPLE_TABLE}"
  if [ $? == 0 ]
  then
    printf "${bold}YOUR TABLE INSTALLATION HAS BEEN QUEUED!\n\n${normal}To track progress, enter ${bold}redactics list-runs sampletable-${SAMPLE_TABLE}${normal} or visit the ${bold}Workflow Jobs${normal} section of your Redactics account.\nBoth the results and any errors will be reported to your Redactics account\n"
  fi
  ;;

output-diagnostics)
  get_namespace
  get_redactics_scheduler
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
  localenv+=$(echo $REDACTICS_SCHEDULER)
  printf "$localenv" > ${OUTPUT_FOLDER}/env.log
  $HELM ls --all-namespaces > ${OUTPUT_FOLDER}/helm.log
  $KUBECTL -n $NAMESPACE get pods > ${OUTPUT_FOLDER}/pods.log
  $KUBECTL -n $NAMESPACE get pv > ${OUTPUT_FOLDER}/pv.log
  $KUBECTL -n $NAMESPACE get pvc > ${OUTPUT_FOLDER}/pvc.log
  $KUBECTL -n $NAMESPACE get secret > ${OUTPUT_FOLDER}/secret-listing.log
  $KUBECTL -n $NAMESPACE logs -l app.kubernetes.io/name=http-nas --tail=-1 > ${OUTPUT_FOLDER}/http-nas.log
  $KUBECTL -n $NAMESPACE -c scheduler logs -l component=scheduler --tail=-1 > ${OUTPUT_FOLDER}/scheduler.log
  $KUBECTL -n $NAMESPACE -c scheduler cp $REDACTICS_SCHEDULER:/opt/airflow/logs ${OUTPUT_FOLDER}/airflow-logs
  printf "A folder called \"$OUTPUT_FOLDER\" has been created. Please zip this folder and send it to Redactics support for assistance with troubleshooting Redactics SMART Agent issues\n"
  ;;

version)
  printf "$VERSION (visit https://app.redactics.com/developers to check on version updates)\n"
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
