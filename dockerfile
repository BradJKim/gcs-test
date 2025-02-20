FROM node:23

RUN mkdir -p /home/node/app/.erb && mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package.json .

USER node

COPY ./.erb ./erb

COPY --chown=node:node ./src .

RUN npm install

CMD ["npm", "start"]