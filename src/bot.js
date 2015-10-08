'use strict';

// dependencies
var TelegramBot = require('node-telegram-bot-api');
var CloudrinoClient = require('./clodrino-client');
var errors = require('./errors');

// env variables
var token = process.env.TOKEN;
var port = process.env.PORT || 5000;
var webHook = process.env.WEHBOOK_URL;

// check variables
if (!token) {
    console.error("Please add a TOKEN env variable with the TelegramBot token");
    process.exit(1);
}

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

            // reply
            switch (command) {

                case '/start':
                    bot.sendMessage(msg.chat.id,
                        'Welcome! This simple bot allows to check the queue on Cloudrino.net\n' +
                        'Explain commands... TODO');
                    break;

                case '/test':
                    new CloudrinoClient()
                        .getPosition('davide.pedranz@gmail.com')
                        .then(function (o) {
                            bot.sendMessage(msg.chat.id, '#' + o.position + ' of #' + o.total);
                        })
                        .catch(errors.PositionNotFound, function (e) {
                            bot.sendMessage(msg.chat.id, 'Email not found');
                        })
                        .catch(function (e) {
                            bot.sendMessage(msg.chat.id, 'Unknown error, probably Cloudrino has changed something...');
                        });
                    break;

                default:
                    bot.sendMessage(msg.chat.id, 'Unknown command');
                    break;
            }
        });

        // debug message
        console.info('# running... Press Ctrl+C to exit'.replace('#', myName));
    })
    .catch(function (e) {
        console.error('Error starting the Bot... maybe the TOKEN is wrong?');
        process.exit(1);
    });
