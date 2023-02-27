#!/bin/bash

set -exo pipefail

DATABASE=$1
CLONE_DATABASE=$2
EXCLUSIONS=$3

pgdump_exclusions=()
if [ ! -z $EXCLUSIONS ]; then
    IFS=',' read -r -a exclusions <<< "$EXCLUSIONS"
    for e in "${exclusions[@]}"
    do
        pgdump_exclusions+=(" --exclude-table=${e}")
    done
fi

/scripts/prep-certs.sh

pg_dump -d $DATABASE ${pgdump_exclusions[*]} -v -Fc | pg_restore -v -d $CLONE_DATABASE
