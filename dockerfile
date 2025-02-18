FROM node:23

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package.json .

USER node

RUN npm install --ignore-scripts

COPY --chown=node:node ./server .

EXPOSE 8080

CMD ["npm", "run", "backend"]