#!/bin/bash

set -exo pipefail

WORKFLOW=$1
SCHEMA=$2
SEQEUNCE_CMDS=$3

/scripts/prep-certs.sh

PSQL="psql --quiet --tuples-only --no-align"

# Nulogy patch for setting sequences
if [ -z "$SEQUENCE_CMDS" ]
then
    echo $SEQEUNCE_CMDS | curl -X POST -H "Transfer-Encoding: chunked" -s -f -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}-set-sequences.sql
else
    $PSQL -c "SELECT 
    'SELECT SETVAL(' ||
       quote_literal(quote_ident(sequence_namespace.nspname) || '.' || quote_ident(class_sequence.relname)) ||
       ', COALESCE(MAX(' ||quote_ident(pg_attribute.attname)|| '), 1) ) FROM ' ||
       quote_ident(table_namespace.nspname)|| '.'||quote_ident(class_table.relname)|| ';'
FROM pg_depend 
    INNER JOIN pg_class AS class_sequence
        ON class_sequence.oid = pg_depend.objid 
            AND class_sequence.relkind = 'S'
    INNER JOIN pg_class AS class_table
        ON class_table.oid = pg_depend.refobjid
    INNER JOIN pg_attribute 
        ON pg_attribute.attrelid = class_table.oid
            AND pg_depend.refobjsubid = pg_attribute.attnum
    INNER JOIN pg_namespace as table_namespace
        ON table_namespace.oid = class_table.relnamespace AND table_namespace.nspname = '${SCHEMA}'
    INNER JOIN pg_namespace AS sequence_namespace
        ON sequence_namespace.oid = class_sequence.relnamespace
ORDER BY sequence_namespace.nspname, class_sequence.relname;" | curl -X POST -H "Transfer-Encoding: chunked" -s -f -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Fschema-${SCHEMA}-set-sequences.sql
fi