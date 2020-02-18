FROM node:12.13.1

RUN mkdir -p /aggregator
RUN chown -R node /aggregator
USER node
WORKDIR /aggregator

COPY . .

RUN npm ci

RUN npm run build
# we're using numerical user to match kubernetes
USER 1000
CMD [ "npm", "run", "start::prod" ]