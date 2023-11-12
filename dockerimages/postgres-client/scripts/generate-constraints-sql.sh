#!/bin/bash

set -exo pipefail

WORKFLOW=$1
INPUT=$2

/scripts/prep-certs.sh

PSQL="psql --quiet --tuples-only --no-align"

# drop constraints file
$PSQL -c "SELECT 'ALTER TABLE \"'||nspname||'\".\"'||relname||'\" DROP CONSTRAINT IF EXISTS \"'||conname||'\" CASCADE;' FROM pg_constraint INNER JOIN pg_class ON conrelid=pg_class.oid INNER JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace WHERE nspname != 'pg_toast' AND nspname != 'pg_catalog' AND nspname != 'information_schema' AND nspname != 'anon' ORDER BY CASE WHEN contype='f' THEN 0 ELSE 1 END,contype,nspname,relname,conname;" | curl -X POST -H "Transfer-Encoding: chunked" -s -f -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Finput-${INPUT}-drop-constraints.sql

# restore constraints file
$PSQL -c "SELECT 'ALTER TABLE \"'||nspname||'\".\"'||relname||'\" ADD CONSTRAINT \"'||conname||'\" '|| pg_get_constraintdef(pg_constraint.oid)||';' FROM pg_constraint INNER JOIN pg_class ON conrelid=pg_class.oid INNER JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace WHERE nspname != 'pg_toast' AND nspname != 'pg_catalog' AND nspname != 'information_schema' AND nspname != 'anon' ORDER BY CASE WHEN contype='f' THEN 0 ELSE 1 END DESC,contype DESC,nspname DESC,relname DESC,conname DESC;" | curl -X POST -H "Transfer-Encoding: chunked" -s -f -T - http://agent-http-nas:3000/file/${WORKFLOW}%2Finput-${INPUT}-restore-constraints.sql