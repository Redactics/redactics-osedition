#!/bin/bash

echo "*** staging SSL certs" &&
mkdir /pgcerts
cp -r /pgcerts-secrets/* /pgcerts/ || true
chmod 0600 /pgcerts/*/..data/sslkey || true
