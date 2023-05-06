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

if [ -z "$SOURCE_PRIMARY_KEY" ]
then
    SOURCE_PRIMARY_KEY=$PRIMARY_KEY
fi

if [ "$CONNECTION" == "redactics-tmp" ]
then
    # provided schema will be source schema, designate redactics tmp schema 
    DEST_TABLE="\"${WORKFLOW}\".\"${TABLE_NOSCHEMA}\""
else
    # provided schema will be redactics tmp schema, designate source schema
    DEST_TABLE="\"${SOURCE_SCHEMA}\".\"${TABLE_NOSCHEMA}\""
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
    if [ "$CONNECTION" == "redactics-tmp" ]
    then
        TEMP_TABLE=\"${WORKFLOW}\".\"redactics_${TABLE_NOSCHEMA:0:53}\"
        # remove redactics generated columns so that we don't have to manipulate CSV to match source schema
        psql -c "ALTER TABLE \"${WORKFLOW}\".\"${TABLE_NOSCHEMA}\" DROP COLUMN IF EXISTS redacted_email_counter;"
    else
        TEMP_TABLE=\"${SOURCE_SCHEMA}\".\"redactics_${TABLE_NOSCHEMA:0:53}\"
    fi

    # restore from delta dataset, and specify columns for digital twin to omit primary key

    # new rows
    check=$(curl -s http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-new.csv/wc)
    if [ "$check" != "Not Found" ] && [ "$check" != "0" ]
    then
        if [ "$CONNECTION" == "redactics-tmp" ]
        then
            # clone to Redactics DB
            curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-new.csv | psql -c "\copy ${DEST_TABLE} from stdin DELIMITER ',' csv;"
        else
            # digital twin
            curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-new.csv | csvquote | gawk -vOFS=, -F "," "{print $AWK_PRINT}" | csvquote -u | psql -c "\copy ${DEST_TABLE}(${COLUMNS}) from stdin DELIMITER ',' csv;"
        fi
    fi

    # updated rows
    check=$(curl -s http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-updated.csv/wc)
    if [ "$check" != "Not Found" ] && [ "$check" != "0" ]
    then
        psql -c "DROP TABLE IF EXISTS ${TEMP_TABLE};"
        psql -c "CREATE TABLE ${TEMP_TABLE} AS SELECT * FROM ${DEST_TABLE} LIMIT 0;"
        if [ "$CONNECTION" == "redactics-tmp" ]
        then
            # clone to Redactics DB
            curl -fs http://agent-http-nas:3000/file/${WORKFLOW}%2Fdelta-table-${TABLE_NOQUOTES}-updated.csv | psql -c "\copy ${TEMP_TABLE} from stdin DELIMITER ',' csv;"
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
            if [ "$column" != "redacted_email_counter" ]
            then
                updates+=("\"${column}\"=${TEMP_TABLE}.\"${column}\"")
            fi
        done
        update_statements=$(IFS=, ; echo "${updates[*]}")
        psql -c "UPDATE ${DEST_TABLE} SET ${update_statements} FROM ${TEMP_TABLE} WHERE ${DEST_TABLE}.${SOURCE_PRIMARY_KEY} = ${TEMP_TABLE}.${SOURCE_PRIMARY_KEY};"
        psql -c "DROP TABLE ${TEMP_TABLE};"
    fi
fi