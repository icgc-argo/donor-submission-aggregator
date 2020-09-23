FROM node:12.13.1

ENV APP_UID=9999
ENV APP_GID=9999
RUN groupmod -g $APP_GID node 
RUN usermod -u $APP_UID -g $APP_GID node
RUN mkdir -p /aggregator
RUN chown -R node /aggregator
USER node
WORKDIR /aggregator

COPY . .

RUN npm ci

RUN npm run build
RUN rm dist/**/*.test.js dist/**/*.test.js.map
CMD [ "npm", "run", "start::prod" ]
