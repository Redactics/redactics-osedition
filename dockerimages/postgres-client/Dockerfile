FROM postgres:15

COPY csvquote /csvquote

RUN apt update && \
  apt install -y curl gawk build-essential && \
  cd /csvquote && \
  make && \
  make install

COPY scripts /scripts