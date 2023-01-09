FROM node:12-bullseye

WORKDIR /src
COPY package.json /src/
RUN npm install
ENV PATH="/src/node_modules/.bin:${PATH}"
COPY . /src

CMD ["pm2-runtime", "-i", "max", "./server.js"]