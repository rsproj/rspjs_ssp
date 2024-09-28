FROM keymetrics/ssp:latest-alpine

# Bundle APP files
COPY ./app /app
WORKDIR /app

# Install app dependencies
ENV NPM_CONFIG_LOGLEVEL warn
RUN npm install --production

ENV KEYMETRICS_SECRET xxxx
ENV KEYMETRICS_PUBLIC yyyy

CMD [ "ssp-runtime", "process.config.js" ]
