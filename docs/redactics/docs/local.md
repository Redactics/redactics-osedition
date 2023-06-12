---
sidebar_position: 8
---

# Local Testing

## Dataset Installation

The Redactics CLI supports injecting datasets created with your "Data Repository" data feed into your local database container being run by Docker Compose. To generate this docker-compose config/yaml file, simply run the `init-postgres-datarepo` command with the required arguments detailed in your CLI documentation you can view simply by invoking the CLI (this includes the S3 bucket where your data repository is hosted). This command needs to be run once to generate this file, and then from there you can run the `install-postgres-dataset` command to do the actual work of installing this dataset locally using this configuration file.

## Local Agent Testing

If you wish to test the Redactics Agent locally you will need to install the Helm chart to a local Kubernetes cluster. There are many ways to setup a local Kubernetes cluster, but we currently test against the one included in Docker Desktop (which is disabled by default, but can be enabled within your Docker Desktop settings). The Redactics API supports an environment variable for running the API locally which will modify your Agent installation recipe to work locally.

### Sample Dataset Installation

For your local testing it may be helpful to generate a sample dataset you can use for testing against. To install these datasets, use the `install-sample-table` CLI command. If you wish to access the CSV data and schema for these sample databases [you can do so via this repo](https://github.com/Redactics/redactics-sampledatasets).


