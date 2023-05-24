#!/bin/bash

set -exo pipefail

WORKFLOW=$1
S3_BUCKET=$2

usage()
{
  printf 'Usage:\n' "$0"
  printf '\t%s\n' "/bin/upload-to-s3 [workflow ID] [Amazon S3 bucket URL]"
}

if [ -z $WORKFLOW ] || [ -z $S3_BUCKET ]
then
    usage
    exit 1
fi

# retrieve all files belonging to workflow
files=$(curl -fs http://agent-http-nas:3000/file/${WORKFLOW})
files_array=($files)

for file in "${files_array[@]}"
do
    if [[ $file =~ ^table- ]]
    then
      printf "Uploading ${file} to ${S3_BUCKET}/${file}\n"
      /bin/agent-filestreamer download-export $WORKFLOW $file | aws s3 cp - ${S3_BUCKET}/${file}
    fi
done