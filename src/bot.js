'use strict';

var RedisClient = require('./redis');
var TelegramBot = require('node-telegram-bot-api');
var CloudrinoClient = require('./clodrino-client');
var errors = require('./errors');
var Status = require('./status');
var Messages = require('./messages');

// helper function -> exit with error
var exit = function (msg) {
    console.error(msg);
    throw new Error(msg);
};

module.exports = function (token, options) {
    options = options || {};

    // check variables
    if (!token) {
        exit('Please add a TOKEN env variable with the TelegramBot token');
    }

    // check if the bot should use a webHook
    var webHook = options.webHook;

    // create DB client
    var redis = new RedisClient(options.redisUrl);

    // create Cloudrino client
    var cloudrino = new CloudrinoClient();

    // set bot mode (polling vs webHook) depending ok the environment
    var botOptions = {};
    if (webHook) {
        botOptions.webHook = {
            port: options.port || 5000,
            host: '0.0.0.0'
        };
    } else {
        botOptions.polling = true;
    }

    // create Bot
    var bot = new TelegramBot(token, botOptions);
    if (webHook) {
        bot.setWebHook(webHook + ':443/bot' + token);
    }

    // get bot name
    bot.getMe().then(function (me) {

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
                    redis.getStatus(chatID).then(function (status) {
                        bot.sendMessage(chatID, status === Status.DEFAULT ? Messages.NO_ACTIVE_COMMAND : Messages.COMMAND_CANCELLED);
                    });
                    break;

                // add a new email address
                case '/add':
                    redis.setStatus(chatID, Status.ADD_EMAIL).then(function () {
                        bot.sendMessage(chatID, Messages.ADD_EMAIL);
                    });
                    break;

                // remove a email address
                case '/remove':
                    redis.getEmails(chatID).then(function (emails) {
                        if (emails.length > 0) {
                            redis.setStatus(chatID, Status.REMOVE_EMAIL).then(function () {
                                var keyboard = emails.reduce(function (accumulator, current) {
                                    accumulator.push([current]);
                                    return accumulator;
                                }, []);
                                bot.sendMessage(chatID, Messages.REMOVE_EMAIL, {
                                    reply_markup: JSON.stringify({
                                        keyboard: keyboard,
                                        one_time_keyboard: false
                                    })
                                });
                            });
                        } else {
                            bot.sendMessage(chatID, Messages.NO_EMAILS);
                        }
                    });
                    break;

                case '/check':
                    redis.getEmails(chatID).map(function (email) {
                        return cloudrino.getPosition(email).then(function (o) {
                            return email + ' -> #' + o.position + ' of #' + o.total;
                        }).catch(errors.PositionNotFound, function () {
                            return email + Messages.X_NOT_FOUND;
                        });
                    }).then(function (results) {
                        var msg = results.reduce(function (accumulator, current) {
                            return accumulator + current + '\n';
                        }, '');
                        bot.sendMessage(chatID, msg || Messages.NO_EMAILS);
                    }).catch(function () {
                        bot.sendMessage(chatID, Messages.UNKNOWN_ERROR);
                    });

                    break;

                default:
                    redis.getStatus(chatID).then(function (status) {
                        switch (status) {

                            case Status.ADD_EMAIL:
                                redis.addEmail(chatID, msg.text).then(function (added) {
                                    bot.sendMessage(chatID, added ? Messages.OK : Messages.EMAIL_ALREADY_PRESENT);
                                    redis.setStatus(chatID, Status.DEFAULT);
                                });
                                break;

                            case Status.REMOVE_EMAIL:
                                redis.removeEmail(chatID, msg.text).then(function (removed) {
                                    if (removed) {
                                        bot.sendMessage(chatID, Messages.OK, {
                                            reply_markup: JSON.stringify({
                                                hide_keyboard: true
                                            })
                                        });
                                        redis.setStatus(chatID, Status.DEFAULT);
                                    } else {
                                        bot.sendMessage(chatID, Messages.EMAIL_NOT_FOUND);
                                    }
                                });
                                break;

                            default:
                                if (new RegExp('^\/([^@])*((' + me.username + ')\s*.*)?$').test(command)) {
                                    bot.sendMessage(chatID, Messages.UNKNOWN_COMMAND);
                                }
                        }
                    });
            }
        });

        // debug message
        console.info('# running... Press Ctrl+C to exit'.replace('#', myName));

    }).catch(function () {
        /* istanbul ignore next */
        exit('Error starting the Bot... maybe the TOKEN is wrong?');
    });

    // add function to reset the bot
    bot.reset = function () {
        return redis.clear();
    };

    return bot;
};