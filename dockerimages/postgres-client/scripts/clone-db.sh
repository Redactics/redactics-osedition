#!/bin/bash

set -exo pipefail

DATABASE=$1
CLONE_DATABASE=$2

/scripts/prep-certs.sh

pg_dump -d $DATABASE -v -Fc | pg_restore -v -d $CLONE_DATABASE
