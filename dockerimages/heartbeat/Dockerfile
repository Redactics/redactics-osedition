FROM alpine:3

RUN apk add curl bash
COPY scripts/heartbeat.sh /heartbeat.sh

CMD ["/heartbeat.sh"]