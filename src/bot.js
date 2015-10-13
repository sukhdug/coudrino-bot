'use strict';

// env variables
var redisUrl = process.env.REDIS_URL;
var token = process.env.TOKEN;
var port = process.env.PORT || 5000;
var webHook = process.env.WEHBOOK_URL;

// dependencies
var RedisClient = require('./redis');
var TelegramBot = require('node-telegram-bot-api');
var CloudrinoClient = require('./clodrino-client');
var errors = require('./errors');
var Status = require('./status');
var Messages = require('./messages');

// check variables
if (!token) {
    console.error('Please add a TOKEN env variable with the TelegramBot token');
    process.exit(1);
}

// create DB client
var redis = new RedisClient(redisUrl);

// create Cloudrino client
var cloudrino = new CloudrinoClient();

// set bot mode (polling vs webHook) depending ok the environment
var options = {};
if (webHook) {
    options.webHook = {
        port: port,
        host: '0.0.0.0'
    };
} else {
    options.polling = true;
}

// create Bot
var bot = new TelegramBot(token, options);
if (webHook) {
    bot.setWebHook(webHook + ':443/bot' + token);
}

// get bot name
bot.getMe()
    .then(function (me) {

        // save bot name
        var myName = '@' + me.username;

        // reply to text messages
        bot.on('text', function (msg) {

            // parse command (eg. /start@CloudrinoBot => /start)
            var command = msg.text.replace(myName, '');

            // get chat id
            var chatID = msg.chat.id;

            // reply
            switch (command) {

                // show the welcome message
                case '/start':
                    bot.sendMessage(chatID, Messages.WELCOME);
                    break;

                // cancel the current command, if any
                case '/cancel':
                    redis.getStatus(chatID)
                        .then(function (status) {
                            bot.sendMessage(chatID, status === Status.DEFAULT ? Messages.NO_ACTIVE_COMMAND : Messages.COMMAND_CANCELLED);
                        });
                    break;

                case '/add':
                    redis.setStatus(chatID, Status.ADD_EMAIL)
                        .then(function () {
                            bot.sendMessage(chatID, Messages.ADD_EMAIL);
                        });
                    break;

                case '/all':
                    redis.getEmails(chatID)
                        .then(function (emails) {
                            return emails;
                        })
                        .map(function (email) {
                            return cloudrino.getPosition(email)
                                .then(function (o) {
                                    return email + ' -> #' + o.position + ' of #' + o.total;
                                })
                                .catch(errors.PositionNotFound, function () {
                                    return email + ' not found';
                                });
                        })
                        .then(function (results) {
                            var msg = results.reduce(function (accumulator, current) {
                                return accumulator + current + '\n';
                            }, '');
                            bot.sendMessage(chatID, msg);
                        })
                        .catch(function () {
                            bot.sendMessage(chatID, Messages.UNKNOWN_ERROR);
                        });
                    break;

                default:
                    redis.getStatus(chatID)
                        .then(function (status) {
                            switch (status) {

                                case Status.ADD_EMAIL:
                                    redis.addEmail(chatID, msg.text)
                                        .then(function (added) {
                                            bot.sendMessage(chatID, added ? 'OK' : Messages.EMAIL_ALREADY_PRESENT);
                                        })
                                        .then(function () {
                                            redis.setStatus(chatID, Status.DEFAULT);
                                        });
                                    break;

                                default:
                                    if (/^\//.test(command)) {
                                        bot.sendMessage(chatID, Messages.UNKNOWN_COMMAND);
                                    }
                            }
                        });
            }
        });

        // debug message
        console.info('# running... Press Ctrl+C to exit'.replace('#', myName));
    })
    .catch(function () {
        console.error('Error starting the Bot... maybe the TOKEN is wrong?');
        process.exit(1);
    });

// add function to reset the bot
bot.reset = function () {
    return redis.clear();
};

// export the bot for tests
module.exports = bot;