FROM node:12.13.1

WORKDIR /aggregator

COPY . .

RUN npm ci

RUN npm run build

CMD [ "npm", "run", "start::prod" ]