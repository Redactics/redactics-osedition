---
sidebar_position: 1
---

# Intro

Redactics is an Agent that is installed adjacent to your databases that provides a range of functionality to assist with development/testing, generating production data samples, automating cloning your production database for doing dry-runs of your database migrations, managing datasets for demo environments, and more. All Redactics features and workflows are compliance-friendly by providing data security layers and being data privacy minded, providing options to generate "safe" data free of personally identifiable information (PII) and sensitive data. The Redactics approach also supports a "data privacy by design" data security approach in allowing all of your stakeholders to default to working with safe data.

There are a number of tools available for replicating data, but Redactics is particularly useful when you require ongoing replication and you'd like to write to your target database without breaking the one-way replication with issues such as conflicting primary keys.

## Redactics Editions

There are currently two Redactics editions: the open source edition, and the free/hosted/SaaS edition (i.e. https://www.redactics.com). Then open source edition includes all of the core components that interact directly with your production database, and provides the configuration API and dashboard for you to host in your own environment. The Free edition includes features built on top of the open source core, provides a hosted version of the configuration API and dashboard, and this hosted version supports authentication to the dashboard and the ability to establish role based access control for regulating access controls, whereas the open source edition leaves it up to you to figure out how to secure access to the API and dashboard (although an access method based on Kubernetes port-forwarding will be provided in these instructions). An Enterprise edition is currently in development and will be announced at a future date.

Both Free and Enterprise editions will always be based off of the same open source code, so if you wish to help harden or assess the security of Redactics, the open source edition is your best option for that given its source code availability. With all editions, the Redactics Agent is installed into your infrastructure and there is no data that leaves or is sent outside of your infrastructure, what is hosted by Redactics is simply the configuration dashboard and its API, and the only data sent to Redactics is metadata such as metrics and diagnostic info including stack traces. With all editions, Kubernetes is the currently supported infrastructure for hosting this software, so you'll need access to a Kubernetes cluster. If you don't currently use Kubernetes, that's okay, the instructions here are all recipe based and can be applied to a managed version of Kubernetes including AWS EKS, Google Cloud GKE, and Azure AKS, although we'll consider provisioning these clusters outside of the scope of this documentation.

Kubernetes Helm is used by all editions to simplify installation. If you don't currently work with Helm, this is also okay, all you need to do is install Helm onto the same workstation you use to access your Kubernetes cluster via [the installation instructions found here](https://helm.sh/docs/intro/install).


## Open Source Repo Contents

[The open source repo can be found here](https://github.com/Redactics/redactics-osedition). **This section is not applicable to those that have opted to use the Free edition**.

* **agent**: the Redactics Agent is the core part of this repo. It is a collection of Apache Airflow DAGs installed via a Helm chart. It receives its configuration in real-time via the Redactics API which outputs JSON data structures of the workflow configurations defined by the dashboard. 
* **api**: the aforementioned Redactics API's job is to feed JSON configurations to the Airflow workflows/DAGs. It also helps generate Helm install commands and local YAML files containing the sensitive connection info for your data sources (e.g. database hosts and passwords) which are provided to the Airflow workflows/DAGs for connectivity (and encrypted storage). It is written in Node.js, and does not include authentication support or user management. It is intended to reside adjacent to your Redactics Agent (which is adjacent to your production database), so it is strongly recommended to not expose this to the public, and instead install on a private network with appropriate access controls of your choosing and appropriate Kubernetes RBAC rules (we'll provide some examples and options below).
* **cli**: the Redactics Agent can be remote controlled via this CLI, which is simply a bash script which makes interacting with the Agent convenient. For example, if you wish to trigger a DAG/workflow outside of its scheduled time you can do so via this CLI.
* **dashboard**: this dashboard is a React app built with Create React App for configuring your Redactics Agent and workflows via the Redactics Node.js API. Since it relies on the Redactics API it is also intended to be accessed via a private network with appropriate access controls and Kubernetes RBAC rules.
* **dockerimages**: all custom Docker images used by Redactics can be accessed here.
* **docs***: this documentation.
* **helmcharts**: this Kubernetes Helm chart drives the turn-key installation of all of the above components, and PostgreSQL (which is used to back Airflow and to assist with various data transformations) into your Kubernetes namespace. A public Chartmuseum repo containing all versions of this Helm chart is available, but if you wish to self-host your Helm chart you can do so via this Helm chart.