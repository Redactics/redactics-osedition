# Redactics

Redactics is an open source collection of turn-key style data management workflows focused on providing both data privacy and data security, backed by Apache Airflow and hosted via Kubernetes. These workflows and their capabilities include:

* A highly performant data-privacy focused ETL pipeline that automates not only applying suitable redactions to datasets to handle sensitive information and PII so that they are free to share, access, and distribute within your organization, but also automates delivering this data to wherever it needs to go via its "data feeds". For example, a data feed can automate delivering datasets (on a recurring schedule) to a digital twin database clone or an Amazon S3 bucket. You can even build your own data feeds by providing this workflow with your own custom Docker image.
* Database syncing via the Digital Twin data feed, which includes delta updates which in many cases helps drive near real-time replication using only SQL (and not requiring any additional infrastructure such as Apache Kafka).
* Database migration dry-runs that can be integrated with your CI/CD pipeline to test applying your database migration to a clone of your production database. Redactics automates generating this production database clone and provides sample integrations with many CI/CD platforms so that you can trigger these dry-runs via your CI/CD pipelines.
* Replicating "safe" production data samples (i.e. data that is free of sensitive information including PII) on an ongoing basis to staging/test environments, replacing your seed and dummy data.
* Up your data security by replacing access to your production databases with access to Redactics-managed databases instead, defaulting to working with safe data.

This repo is the open source core of https://app.redactics.com (information can be found at https://www.redactics.com). It includes all of the core components of the hosted version of Redactics, including all of the components that interact directly with your production database, so if you wish to help harden this project or vet what it is doing, you can do so by contributing to this repo. The hosted version of Redactics includes some additional features, but changes to its core will always be kept in sync with this repo, and vice versa.

----

## To start using Redactics

We are working on building out our documentation as we speak, but for starters, here is what is included in this repo:

* **agent**: the Redactics Agent is the core part of this repo. It is a collection of Apache Airflow DAGs installed via a Helm chart. It receives its configuration in real-time via the Redactics API which outputs JSON data structures of the workflow configurations defined by the dashboard. 
* **api**: the aforementioned Redactics API's job is to feed JSON configurations to the Airflow workflows/DAGs. It also helps generate Helm install commands and local YAML files containing the sensitive connection info for your data sources (e.g. database hosts and passwords) which are provided to the Airflow workflows/DAGs for connectivity (and encrypted storage). It is written in Node.js, and does not include authentication support or user management. It is intended to reside adjacent to your Redactics Agent (which is adjacent to your production database), so it is strongly recommended to not expose this to the public, and instead install on a private network with appropriate access controls of your choosing and appropriate Kubernetes RBAC rules (we'll provide some examples and options below).
* **cli**: the Redactics Agent can be remote controlled via this CLI, which is simply a bash script which makes interacting with the Agent convenient. For example, if you wish to trigger a DAG/workflow outside of its scheduled time you can do so via this CLI.
* **dashboard**: this dashboard is a React app built with Create React App for configuring your Redactics Agent and workflows via the Redactics Node.js API. Since it relies on the Redactics API it is also intended to be accessed via a private network with appropriate access controls and Kubernetes RBAC rules.
* **dockerimages**: all custom Docker images used by Redactics can be accessed here.
* **helmcharts**: this Kubernetes Helm chart drives the turn-key installation of all of the above components, and PostgreSQL (which is used to back Airflow and to assist with various data transformations) into your Kubernetes namespace. A public Chartmuseum repo containing all versions of this Helm chart is available, but if you wish to self-host your Helm chart you can do so via this Helm chart.

## Quick Start

### Install the Agent into your Kubernetes namespace

```
export PGPASSWORD=changeme
export NAMESPACE=redactics
helm upgrade --install --cleanup-on-fail --create-namespace -n redactics agent ./helmcharts/agent-osedition \
--set "redactics.namespace=redactics" \
--set "http-nas.persistence.enabled=false" \
--set "airflow.connections[0].id=redacticsDB" \
--set "airflow.connections[0].password=${PGPASSWORD}" \
--set "postgresql.primary.persistence.enabled=true" \
--set "postgresql.primary.persistence.size=5Gi" \
--set "postgresql.connection=postgresql://postgres:${PGPASSWORD}@agent-postgresql:5432/postgres"
```

If you don't want to use the namespace `redactics` you can change that to whatever you like, and be sure to replace the `changeme` password provided for `PGPASSWORD` with a strong password of your choosing. This password is for the internal Agent PostgreSQL database used by Apache Airflow. 

Once the Redactics Agent has been installed you'll need to access the Dashboard and define your data sources in the `Data Sources` and define a new Agent in the `Agents` configuration section. Once this is done, the Dashboard will generate a configuration file for you for your Agent you can find in the Agents section along with another Helm command to reinstall the Agent using your new configuration file. The following steps will walk you through this process:

### Accessing the Redactics Dashboard and API

For testing purposes and for managing the initial install a simple way to access the Dashboard is via Kubernetes port-forwarding (read the Security and Network Considerations sections below for info on securing your Redactics Agent infrastructure for production usage). You'll need to be authenticated to Kubernetes via a user with appropriate access to the namespace where the Agent is installed. The port forwarding commands are as follows (you'll need to run these in separate terminal windows):

`kubectl port-forward deploy/agent-api 3000`
`kubectl port-forward deploy/agent-dashboard 8000:80`

This will allow access to the API on port 3000 and the dashboard on port 8000 via your local machine. Run these commands and then open http://localhost:8000 in a web browser.

### Configure the Redactics Agent for Usage

These steps detail the process to prep your Redactics Agent for your first workflow.

1. From within your dashboard define all of your data sources in the `Data Sources` section.
1. Create an Agent in your dashboard's `Agents` section and make sure that this Agent is configured to use these data sources (you can refine these settings in the `Agent` -> `Agent Settings` section).
1. Save the provided configuration file found in your dashboard's `Agent` -> `Agent Config File` section to the path you've specified in `Agent` -> `Agent Settings`, and copy the provided `helm upgrade` command to your clipboard - you'll need this shortly.
1. Run `helm uninstall agent` to uninstall the temporary Agent and prepare for a reinstall using your new configuration file.
1. Re-install the Agent via the helm upgrade command you recorded above. This will install your Agent using your new configuration file you have saved locally, saving an encrypted copy of your connection information to the internal PostgreSQL database, and will prep the persistent volume needed for your workflows.
1. Once the Agent has been installed you can start configuring your workflows and using all of the provided Redactics features. If you ever need to change your data sources and/or your configuration file you will need to reinstall the Agent to apply these changes. You do not need to reinstall the Agent when you make workflow changes (or add new workflows) unless prompted.

### Security and Network Considerations

It is important that you secure access to both the Dashboard and API. Since both ultimately provide data to the Redactics Agent, they need to reside on the same network as the Agent, and the Agent needs network access to your production database. We recommend putting all on the same network, but in doing so you'll need to protect access to these pods. There is no one way to do this, your Kubernetes RBAC rules and network/service mesh approaches will vary. Since you can use RBAC rules to protect port-forwarding access, using the above port-forwarding approach is a safe access option as this feature establishes an encrypted tunnel for access. If you elect to create an ingress configuration to your dashboard and APIs, it is strongly recommended that you whitelist this access to a set IP or CIDR such as a VPN network or the like.

Your database credentials are provided to the Agent helm chart via your Agent configuration file. Since they can be accessed via `helm get values agent` or by base64 decoding the `agent-connections` secret it is advisable that if dashboard users access the dashboard via Kubernetes port-forwarding and they should not have access to these secrets that you create an RBAC role granting only port-forwarding access in this namespace.

Connectivity to your data sources via TLS/SSL is supported, the dashboard will provide instructions on creating a Kubernetes secret containing the certificates used for this connectivity.

Helm install/upgrade commands retrieve the Helm chart via Redactics' ChartMuseum repo. If you are not comfortable with trusting this repo you can use the Helm chart provided in this repo simply by replacing `redactics/agent-osedition` in the Helm command with the full or relative path to helmcharts/agent-osedition. If you wish to self-host the Docker images used by the Agent rather than trusting the Redactics Dockerhub account you can build the Docker images using the Dockerfiles provided in the paths listed below, and use them by adding the following to your Helm configuration file:

```
images:
  airflow:
    repository: [your repo URL for ./agent/Dockerfile]
postgresql:
  image:
    registry: [your repo URL for ./dockerimages/postgres-bitnami/Dockerfile]
http-nas:
  image:
    registry: [your repo URL for the Dockerfile found in https://github.com/Redactics/http-nas]
heartbeat:
  image:
    registry: [your repo URL for ./dockerimages/heartbeat/Dockerfile]
api:
  image:
    repository: [your repo URL for ./api/Dockerfile]
dashboard:
  image:
    repository: [your repo URL for ./dashboard/Dockerfile]
```



