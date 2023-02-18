#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TABLE=$2
FULLCOPY=$3
COLUMNS=$4
AWK_PRINT=$5
PRIMARY_KEY=$6
SOURCE_PRIMARY_KEY=$7
# tables are limited to 63 characters
TEMP_TABLE=redactics_${TABLE:0:53}

if [ -z $SOURCE_PRIMARY_KEY ]
then
    SOURCE_PRIMARY_KEY=$PRIMARY_KEY
fi

/scripts/prep-certs.sh

if [ "$FULLCOPY" == "0" ]
then
    psql -c "TRUNCATE TABLE ${TABLE};"
    curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Ftable-${TABLE}.csv | csvquote | gawk -vOFS=, -F "," "{print $AWK_PRINT}" | csvquote -u | psql -c "\copy ${TABLE}(${COLUMNS}) from stdin DELIMITER ',' csv header;"
else
    # restore from delta dataset, and specify columns for digital twin to omit primary key

    # new rows
    if [ -z $AWK_PRINT ]
    then
        # clone to Redactics DB
        curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE}-new.csv | psql -c "\copy ${TABLE} from stdin DELIMITER ',' csv;"
    else
        # digital twin
        curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE}-new.csv | csvquote | gawk -vOFS=, -F "," "{print $AWK_PRINT}" | csvquote -u | psql -c "\copy ${TABLE}(${COLUMNS}) from stdin DELIMITER ',' csv;"
    fi

    # updated rows
    psql -c "DROP TABLE IF EXISTS ${TEMP_TABLE};"
    psql -c "CREATE TABLE ${TEMP_TABLE} AS SELECT * FROM ${TABLE} LIMIT 0;"
    if [ -z $AWK_PRINT ]
    then
        # clone to Redactics DB
        curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE}-updated.csv | psql -c "\copy ${TEMP_TABLE}(${COLUMNS}) from stdin DELIMITER ',' csv;"
    else
        # digital twin
        curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE}-updated.csv | csvquote | gawk -vOFS=, -F "," "{print $AWK_PRINT}" | csvquote -u | psql -c "\copy ${TEMP_TABLE}(${COLUMNS}) from stdin DELIMITER ',' csv;"
    fi
    # apply updates from temporary table containing new updated data
    IFS=',' read -r -a columns <<< "$COLUMNS"
    updates=()
    for c in "${columns[@]}"
    do
        column=$(echo $c | sed 's/"//g')
        updates+=("\"${column}\"=${TEMP_TABLE}.\"${column}\"")
    done
    update_statements=$(IFS=, ; echo "${updates[*]}")
    psql -c "UPDATE ${TABLE} SET ${update_statements} FROM ${TEMP_TABLE} WHERE ${TABLE}.${SOURCE_PRIMARY_KEY} = ${TEMP_TABLE}.${SOURCE_PRIMARY_KEY};"
    psql -c "DROP TABLE ${TEMP_TABLE};"
fi