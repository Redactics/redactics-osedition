FROM node:18-bullseye

WORKDIR /docs
COPY . /docs/
RUN npm install && npm run build

FROM redactics/nginx:1

COPY --from=0 /docs/build /usr/share/nginx/html
