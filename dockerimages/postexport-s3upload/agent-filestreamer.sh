#!/bin/bash

set -eo pipefail

COMMAND=$1

usage()
{
  printf 'Usage: %s [-h|--help] <command>\n' "$0"
  printf '\t%s\n' "possible commands:"
  printf '\t\t%s\n' "download-export [workflow ID] [filename] (outputs [filename] to stdout)"
  printf '\t\t%s\n' "version (outputs CLI version)"
  printf '\t%s\n' "-h, --help: Prints help"
}

VERSION=1.1.0

case "$1" in

download-export)
  WORKFLOW=$2
  DOWNLOAD=$3
  if [ -z $WORKFLOW ] || [ -z $DOWNLOAD ]
  then
    usage
    exit 1
  fi
  curl -fs --output - http://agent-http-nas:3000/file/${WORKFLOW}%2F${DOWNLOAD}
  ;;

version)
  printf "$VERSION (visit https://app.redactics.com/cli to check on version updates)\n"
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
