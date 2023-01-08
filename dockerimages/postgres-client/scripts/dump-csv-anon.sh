#!/bin/bash
#
#    pg_dump_anon
#    A basic wrapper to export anonymized data with pg_dump and psql
#
#    This is work in progress. Use with care.
#
#

set -exo pipefail

usage()
{
cat << END
Usage: $(basename $0) [OPTION]... [DBNAME]

General options:
  -f, --file=FILENAME           output file
  --help                        display this message

Options controlling the output content:
  -n, --schema=PATTERN          dump the specified schema(s) only
  -N, --exclude-schema=PATTERN  do NOT dump the specified schema(s)
  -t, --table=PATTERN           dump the specified table(s) only
  -T, --exclude-table=PATTERN   do NOT dump the specified table(s)
  --exclude-table-data=PATTERN  do NOT dump data for the specified table(s)

Connection options:
  -d, --dbname=DBNAME           database to dump
  -h, --host=HOSTNAME           database server host or socket directory
  -p, --port=PORT               database server port number
  -U, --username=NAME           connect as specified database user
  -w, --no-password             never prompt for password
  -W, --password                force password prompt (should happen automatically)

If no database name is supplied, then the PGDATABASE environment
variable value is used.

END
}

## Return the version of the anon extension
get_anon_version() {
$PSQL << EOSQL
  SELECT extversion FROM pg_catalog.pg_extension WHERE extname='anon';
EOSQL
}

## Return the masking schema
get_mask_schema() {
$PSQL << EOSQL
  SELECT anon.mask_schema();
EOSQL
}

## Return the masking filters based on the table name
get_mask_filters() {
$PSQL << EOSQL
  SELECT anon.mask_filters('$1'::REGCLASS);
EOSQL
}

get_mask_extract_filters() {
  IFS=',' read -a cols_array <<< "$columns"
  joined=$(printf ",'%s'" "${cols_array[@]}")
$PSQL << EOSQL
  SELECT mask_extract_filters('$1'::REGCLASS, ARRAY[${joined:1}]);
EOSQL
}

##
## M A I N
##

##
## pg_dump and psql have a lot of common parameters ( -h, -d, etc.) but they
## also have similar parameters with different names (e.g. `pg_dump -f` and
## `psql -o` ). This wrapper script allows a subset of pg_dump's parameters
## and when needed, we transform the pg_dump options into the matching psql
## options
##
pg_dump_opt=$@        # backup args before parsing
psql_connect_opt=     # connections options
psql_output_opt=      # print options (currently only -f is supported)
exclude_table_data=   # dump the ddl, but ignore the data
table=

while [ $# -gt 0 ]; do
    case "$1" in
    -d|--dbname)
        psql_connect_opt+=" $1"
        shift
        psql_connect_opt+=" $1"
        ;;
    --dbname=*)
        psql_connect_opt+=" $1"
        ;;
    -f|--file)  # `pg_dump -f foo.sql` becomes `psql -o foo.sql`
        psql_output_opt+=" -o"
        shift
        psql_output_opt+=" $1"
        ;;
    --file=*) # `pg_dump -file=foo.sql` becomes `psql --output=foo.sql`
        psql_output_opt+=" $(echo $1| sed s/--file=/--output=/)"
        ;;
    -h|--host)
        psql_connect_opt+=" $1"
        shift
        psql_connect_opt+=" $1"
        ;;
    --host=*)
        psql_connect_opt+=" $1"
        shift
        psql_connect_opt+=" $1"
        ;;
    -p|--port)
        psql_connect_opt+=" $1"
        ;;
    --port=*)
        psql_connect_opt+=" $1"
        ;;
    -U|--username)
        psql_connect_opt+=" $1"
        shift
        psql_connect_opt+=" $1"
        ;;
    --username=*)
        psql_connect_opt+=" $1"
        ;;
    -w|--no-password)
        psql_connect_opt+=" $1"
        ;;
    -W|--password)
        psql_connect_opt+=" $1"
        ;;
    -n|--schema)
        # ignore the option for psql
        shift
        ;;
    --schema=*)
        # ignore the option for psql
        ;;
    -N|--exclude-schema)
        # ignore the option for psql
        shift
        ;;
    --exclude-schema=*)
        # ignore the option for psql
        ;;
    -t)
        shift
        table=$1
        ;;
    --table=*)
        table=$1
        ;;
    -c)
        shift
        columns=$1
        ;;
    --columns=*)
        columns=$1
        ;;
    --start-date=*)
        start_date="${1/--start-date=/}"
        ;;
    --sample-fields=*)
        sample_fields="${1/--sample-fields=/}"
        ;;
    --created-at=*)
        created_at_field="${1/--created-at=/}"
        ;;
    --updated-at=*)
        updated_at_field="${1/--updated-at=/}"
        ;;
    --delta-field-name=*)
        delta_field_name="${1/--delta-field-name=/}"
        ;;
     --delta-field-val=*)
        delta_field_val="${1/--delta-field-val=/}"
        ;;
    -T|--exclude-table)
        # ignore the option for psql
        shift
        ;;
    --exclude-table=*)
        # ignore the option for psql
        ;;
    --exclude-table-data=*)
        exclude_table_data+=" $1"
        ;;
    --help)
        usage
        exit 0
        ;;
    -*|--*)
        echo $0: Invalid option -- $1
        echo Try "$0 --help" for more information.
        exit 1
        ;;
    *)
        # this is DBNAME
        psql_connect_opt+=" $1"
        ;;
    esac
    shift
done

PSQL="psql $psql_connect_opt --quiet --tuples-only --no-align"
PSQL_PRINT="$PSQL $psql_output_opt"

## Stop if the extension is not installed in the database
version=$(get_anon_version)
if [ -z "$version" ]
then
  echo 'ERROR: Anon extension is not installed in this database.'
  exit 1
fi

if [ "$columns" == "all" ]
then
  filters=$(get_mask_filters $table)
else
  filters=$(get_mask_extract_filters $table $columns)
fi

if [ -z $start_date ] && [ -z $delta_field_name ]
then
  $PSQL_PRINT -c "\copy (SELECT $filters FROM $table) TO STDOUT WITH CSV HEADER"
elif [ ! -z $start_date ]
then
  if [ "$sample_fields" == "created" ]
  then
    $PSQL_PRINT -c "\copy (SELECT $filters FROM $table WHERE \"$created_at_field\" IS NOT NULL AND \"$created_at_field\" > '$start_date') TO STDOUT WITH CSV HEADER"
  elif [ "$sample_fields" == "updated" ]
  then
    $PSQL_PRINT -c "\copy (SELECT $filters FROM $table WHERE \"$updated_at_field\" IS NOT NULL AND \"$updated_at_field\" > '$start_date') TO STDOUT WITH CSV HEADER"
  elif [ "$sample_fields" == "createdAndUpdated" ]
  then
    $PSQL_PRINT -c "\copy (SELECT $filters FROM $table WHERE (\"$created_at_field\" IS NOT NULL AND \"$created_at_field\" > '$start_date') OR (\"$updated_at_field\" IS NOT NULL AND \"$updated_at_field\" > '$start_date')) TO STDOUT WITH CSV HEADER"
  fi
elif [ ! -z $delta_field_name ]
then
  # delta data dump
  if [ -z $delta_field_val ]
  then
    $PSQL_PRINT -c "\copy (SELECT $filters FROM $table WHERE \"$delta_field_name\" IS NOT NULL) TO STDOUT WITH CSV"
  else
    $PSQL_PRINT -c "\copy (SELECT $filters FROM $table WHERE \"$delta_field_name\" IS NOT NULL AND \"$delta_field_name\" > '$delta_field_val') TO STDOUT WITH CSV"
  fi
fi
