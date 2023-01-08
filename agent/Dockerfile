FROM apache/airflow:2.3.2

USER root
RUN apt update && apt install -y jq

RUN mkdir /pgcerts && \
    chown -R 50000 /pgcerts

USER airflow
COPY dags/* /tmp/
COPY fetch-workflows.sh /fetch-workflows.sh
COPY k8s-entrypoint.sh /entrypoint.sh

