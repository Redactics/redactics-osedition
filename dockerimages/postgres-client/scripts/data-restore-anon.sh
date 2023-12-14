#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TABLE=$2
TABLE_NOQUOTES=${TABLE//"\""/}
# tables are limited to 63 characters, and strip quotation marks
SCHEMA=$(echo $TABLE | cut -d "." -f 1)
SCHEMA=${SCHEMA//"\""/}
TABLE_NOSCHEMA=$(echo $TABLE | cut -d "." -f 2)
TABLE_NOSCHEMA=${TABLE_NOSCHEMA//"\""/}
DEST_TABLE="\"${SOURCE_SCHEMA}\".\"${TABLE_NOSCHEMA}\""
DEST_TABLE_NOQUOTES=${DEST_TABLE//"\""/}

/scripts/prep-certs.sh

check=$(curl -s http://agent-http-nas:3000/file/${WORKFLOW}%2Ftable-${TABLE_NOQUOTES}.csv/check)
if [ "$check" != "Not Found" ]
then
    # reset table in the event of task restarts

    psql -c "TRUNCATE TABLE ${DEST_TABLE};"
    curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Ftable-${TABLE_NOQUOTES}.csv | psql -c "\copy ${DEST_TABLE} from stdin DELIMITER ',' csv header;"
fi
