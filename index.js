'use strict';

// check env variables
/* istanbul ignore next */
var token = process.env.TOKEN,
    options = {
        redisUrl: process.env.REDIS_URL,
        webHook: process.env.WEBHOOK_URL,
        port: process.env.PORT
    };

// launch the bot
/* istanbul ignore next */
require('./src/bot')(token, options);
