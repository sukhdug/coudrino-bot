'use strict';

// dependencies
var TelegramBot = require('node-telegram-bot-api');

// env variables
var token = process.env.TOKEN;
var port = process.env.PORT || 5000;
var webHook = process.env.WEBHOOK || false;

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
    bot.setWebHook(domain + ':443/bot' + token);
}

// get bot name
bot.getMe().then(function (me) {

    // save bot name
    var myName = '@' + me.username;

    // reply to text messages
    bot.on('text', function (msg) {

        // parse command (eg. /start@CloudrinoBot => /start)
        var command = msg.text.replace(myName, '');

        // reply
        switch (command) {

            case '/start':
                bot.sendMessage(msg.chat.id, 'Start');
                break;

            default:
                bot.sendMessage(msg.chat.id, 'Unknown command');
                break;
        }
    });

    // debug message
    console.info("# running... Press Ctrl+C to exit".replace('#', myName));
});
