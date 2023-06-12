---
sidebar_position: 7
---

# Disk Space Management

The Helm chart that installs the Redactics Agent for you also provisions a temporary volume used for the ERL workflow as a Kuberentes Persistent Volume Claim. Like all Kubernetes PVCs, this volume can be enlarged but not reduced. If your workflow disk requirements change, you will need to either reinstall the Helm chart, or else enlarge this disk manually. This volume is attached to the `http-nas` deployment, and the workflow data is cleared before each workflow execution, so there is no persistent data that needs to be salvaged in deleting and recreating this volume should you run into an error or problem that necessitates this action.

The Redactics Agent also uses PostgreSQL as its internal database, and it also creates a PVC for tracking its data that may need to be enlarged as new workflows are added or your storage requirements increase. This data is used for tracking delta data updates, which means that if you have to delete this PVC, the next time your workflow runs it may take longer than normal as it needs to regenerate this data. If you receive an error about the PostgreSQL statefulset being immutable, deleting it and then reinstall them Helm chart is harmless - the underlying data will be left intact so long as the PVC is left intact.
