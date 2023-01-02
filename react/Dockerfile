FROM node:12-bullseye

WORKDIR /app
COPY package.json /app/
RUN npm install

COPY . /app

# TODO: figure out why running builds inside the Docker container returns errors
# about this.context
# RUN npm run build

FROM redactics/nginx:1

COPY --from=0 /app/build /usr/share/nginx/html