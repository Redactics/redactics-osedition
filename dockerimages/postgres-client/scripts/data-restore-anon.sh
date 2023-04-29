#!/bin/bash

set -exo pipefail

WORKFLOW=$1
TABLE=$2
TABLE_NOQUOTES=${TABLE//"\""/}
FULLCOPY=$3
COLUMNS=$4
AWK_PRINT=$5
PRIMARY_KEY=$6
SOURCE_PRIMARY_KEY=$7
SOURCE_SCHEMA=$8
# tables are limited to 63 characters, and strip quotation marks
SCHEMA=$(echo $TABLE | cut -d "." -f 1)
SCHEMA=${SCHEMA//"\""/}
TABLE_NOSCHEMA=$(echo $TABLE | cut -d "." -f 2)
TABLE_NOSCHEMA=${TABLE_NOSCHEMA//"\""/}
TEMP_TABLE=redactics_${TABLE_NOSCHEMA:0:53}

if [ -z "$SOURCE_PRIMARY_KEY" ]
then
    SOURCE_PRIMARY_KEY=$PRIMARY_KEY
fi

if [ "$CONNECTION" == "digital-twin" ]
then
    DEST_TABLE="${SOURCE_SCHEMA}.${TABLE_NOSCHEMA}"
else
    DEST_TABLE=$TABLE
fi

/scripts/prep-certs.sh

if [ "$FULLCOPY" == "0" ]
then
    check=$(curl -s http://agent-http-nas:3000/file/${WORKFLOW}%2Ftable-${TABLE_NOQUOTES}.csv/wc)
    if [ "$check" != "Not Found" ]
    then
        # reset table in the event of task restarts
        psql -c "TRUNCATE TABLE ${DEST_TABLE};"
        curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Ftable-${TABLE_NOQUOTES}.csv | csvquote | gawk -vOFS=, -F "," "{print $AWK_PRINT}" | csvquote -u | psql -c "\copy ${DEST_TABLE}(${COLUMNS}) from stdin DELIMITER ',' csv header;"
    fi
else
    # restore from delta dataset, and specify columns for digital twin to omit primary key

    # new rows
    check=$(curl -s http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-new.csv/wc)
    if [ "$check" != "Not Found" ]
    then
        if [ "$CONNECTION" == "redactics-tmp" ]
        then
            # clone to Redactics DB
            curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-new.csv | psql -c "\copy \"${WORKFLOW}\".\"${TABLE_NOSCHEMA}\" from stdin DELIMITER ',' csv;"
        else
            # digital twin
            curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-new.csv | csvquote | gawk -vOFS=, -F "," "{print $AWK_PRINT}" | csvquote -u | psql -c "\copy ${DEST_TABLE}(${COLUMNS}) from stdin DELIMITER ',' csv;"
        fi
    fi

    # updated rows
    check=$(curl -s http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-updated.csv/wc)
    if [ "$check" != "Not Found" ]
    then
        psql -c "DROP TABLE IF EXISTS ${TEMP_TABLE};"
        psql -c "CREATE TABLE ${TEMP_TABLE} AS SELECT * FROM ${DEST_TABLE} LIMIT 0;"
        if [ "$CONNECTION" == "redactics-tmp" ]
        then
            # clone to Redactics DB
            curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-updated.csv | psql -c "\copy ${TEMP_TABLE}(${COLUMNS}) from stdin DELIMITER ',' csv;"
        else
            # digital twin
            curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-updated.csv | csvquote | gawk -vOFS=, -F "," "{print $AWK_PRINT}" | csvquote -u | psql -c "\copy ${TEMP_TABLE}(${COLUMNS}) from stdin DELIMITER ',' csv;"
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
        psql -c "UPDATE ${DEST_TABLE} SET ${update_statements} FROM ${TEMP_TABLE} WHERE ${DEST_TABLE}.${SOURCE_PRIMARY_KEY} = ${TEMP_TABLE}.${SOURCE_PRIMARY_KEY};"
        psql -c "DROP TABLE ${TEMP_TABLE};"
    fi
fi