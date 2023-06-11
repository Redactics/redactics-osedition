---
sidebar_position: 2
---

# Quickstart

## Requirements

The Redactics Agent could work in any hosting environment, but currently a Kubernetes cluster is a requirement, in addition to Kubernetes Helm which is an installation requirement.

The "ERL" (extract, redact, load) workflow creates safe data production samples and delivers them to specified destinations via a feature called "data feeds". It requires temporary disk storage provisioned as a Kuberentes persistent volume claim (PVC). The Helm installation automates provisioning these persistent volumes (PV), but in some cloud providers, notably AWS, you'll need to install a plugin or an additional component for doing so. Please consult your cloud provider's documentation on this, if necessary, we'll consider these steps out-of-scope for this documentation.

Because the Agent utilizes native database functionality for its dump and restores, and because the entire delta update process is SQL based, the Redactics Agent is extremely lightweight in memory and CPU requirements and these requirements are not dependent on your database size. We have found that default instance type sizes work just fine with the Agent.

Data source support includes Postgres 11+, including databases with custom extensions enabled. A wide diversity of datasets have been tested (e.g. tables without primary keys, UUIDs for primary keys, etc.). Please let us know if you come across incompatabilities with your source database. The Agent, of course, requires network access to your data sources.

## Free Edition Account Creation

If you are interested in using the Free edition to get started with the installation of the Redactics Agent into your infrastructure, simply create an account at https://app.redactics.com. Then, follow the installation instructions in the "Initial Usage" section as necessary if you get stuck navigating your account/configuration dashboard.

## Open Source Edition Installation

If you are interested in using the Open Source edition you'll first need to install the configuration dashboard to generate your configuration file and full helm install command. To do so, use the following Helm command from the top level of the open source repository to install a vanilla, unconfigured dashboard and Agent into the `redactics` namespace of your Kubernetes cluster. The `PGPASSWORD` variable is used for the PostgreSQL password used for backing the internal database used by Redactics, so take note of this password because you'll need it again for subsequent steps.


```
export PGPASSWORD=changeme
export NAMESPACE=redactics
helm upgrade --install --cleanup-on-fail --create-namespace -n ${NAMESPACE} agent ./helmcharts/agent-osedition \
--set "redactics.namespace=${NAMESPACE}" \
--set "http-nas.persistence.enabled=false" \
--set "airflow.connections[0].id=redacticsDB" \
--set "airflow.connections[0].password=${PGPASSWORD}" \
--set "postgresql.primary.persistence.enabled=true" \
--set "postgresql.primary.persistence.size=5Gi" \
--set "postgresql.connection=postgresql://postgres:${PGPASSWORD}@agent-postgresql:5432/postgres"
```

## Initial Usage

You'll need to access the Dashboard and define your data sources in the `Data Sources` and define a new Agent in the `Agents` configuration section. Once this is done, the Dashboard will generate a configuration file for you for your Agent you can find in the Agents section along with a Helm command to install (or reinstall, in the case of the open source edition) the Agent using your new configuration file. The following steps will walk you through this process:

### Accessing the Redactics Dashboard and API

#### Free Edition

Access your account created at https://app.redactics.com.

#### Open Source Edition 

It is up to you to figure out the ideal network security and authentication method for accessing the dashboard. For some companies this will be some sort of single sign-on, others may want to require VPN access. There is no concept of users in the open source edition, if you require RBAC controls we would suggest using the Free edition. The intended users of the open source edition are companies that wish source code access.

Kubernetes port-forwarding can be used to access the configuration dashboard and API, which should at least be suitable for testing purposes (you'll need to run these in separate terminal windows/tabs and leave these processes running while you require dashboard access):

* `kubectl -n redactics port-forward deploy/agent-api 3000`
* `kubectl -n redactics port-forward deploy/agent-dashboard 8000:80`

This will allow access to the API on port 3000 and the dashboard on port 8000 via your local machine. Run these commands and then open http://localhost:8000 in a web browser. If you are using port 8000 or 3000 locally these ports should not conflict with this port-forwarding.

### Use the Dashboard to Configure the Redactics Agent for First-time Usage

These steps detail the process to prep your Redactics Agent for your first workflow.

1. From within your dashboard define all of your data sources in the `Data Sources` section.
1. Create an Agent in your dashboard's `Agents` section and make sure that this Agent is configured to use these data sources (you can refine these settings in the `Agent` -> `Agent Settings` section).
1. Save the provided configuration file found in your dashboard's `Agent` -> `Agent Config File` section to the path you've specified in `Agent` -> `Agent Settings`, and copy the provided `helm upgrade` command to your clipboard - you'll need this shortly.
1. **Open Source Edition only**: run `helm uninstall agent` to uninstall the temporary Agent and prepare for a reinstall using your new configuration file.
1. Install/re-install the Agent via the helm upgrade command you recorded above. This will install your Agent using your new configuration file you have saved locally, saving an encrypted copy of your connection information to the internal PostgreSQL database, and will prep the persistent volume needed for your workflows.
1. Once the Agent has been installed you can start configuring your workflows and using all of the provided Redactics features. If you ever need to change your data sources and/or your configuration file you will need to reinstall the Agent to apply these changes. You do not need to reinstall the Agent when you make workflow changes (or add new workflows) unless prompted.
1. *Optional*: install the Redactics CLI (download link available in the dashboard) so you can manually invoke a workflow for testing using the workflow ID provided by the dashboard. The CLI includes some additional functionality as well, including installing some sample tables you can use for test purposes.
