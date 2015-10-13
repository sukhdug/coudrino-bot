'use strict';

// testing tools
var assert = require('assert');
var sinon = require('sinon');

// dependencies
var Messages = require('../src/messages');
var TelegramBot = require('node-telegram-bot-api');
var Bluebird = require('bluebird');
var extend = require('util')._extend;

// constants
var TIMEOUT = 1000;
var ME = Object.freeze({
    id: 123456789,
    first_name: 'CoudrinoBot',
    username: 'CoudrinoBot'
});
var START = Object.freeze({
    message_id: 100,
    from: {
        id: 1234567,
        first_name: 'Test',
        last_name: 'User',
        username: 'user'
    },
    chat: {
        id: 111111,
        first_name: 'Test',
        last_name: 'User',
        username: 'user',
        type: 'private'
    },
    date: 1400000000,
    text: '/start'
});

/**
 * Copy a JSON telegram text message replacing the text command;
 */
var addBotNameToCommand = function (msg) {
    var copy = extend({}, msg);
    copy.text = msg.text + '@' + ME.username;
    return Object.freeze(copy);
};

/**
 * Simulate a new incoming message
 */
var simulateMessage = function (bot, msg) {
    bot.emit('text', msg);
};

// mock bot
sinon.stub(TelegramBot.prototype, 'getMe')
    .returns(new Bluebird(function (resolve) {
        resolve(ME);
    }));

// start the bot
var bot = require('../src/bot');


describe('bot', function () {

    beforeEach(function () {
        this.sinon = sinon.sandbox.create();
    });

    afterEach(function () {
        this.sinon.restore();
    });

    it('#getMe() [MOCK]', function (done) {
        bot.getMe().then(function (me) {
            assert.equal(me, ME);
            done();
        });
    });

    it('/start', function (done) {
        var sendMessage = this.sinon.spy(bot, 'sendMessage');
        simulateMessage(bot, START);

        setTimeout(function () {
            assert(sendMessage.calledOnce);
            assert(sendMessage.calledWith(START.chat.id, Messages.WELCOME));
            done();
        }, TIMEOUT);
    });

    it('/start@Bot', function (done) {
        var sendMessage = this.sinon.spy(bot, 'sendMessage');
        simulateMessage(bot, addBotNameToCommand(START));

        setTimeout(function () {
            assert(sendMessage.calledOnce);
            assert(sendMessage.calledWith(START.chat.id, Messages.WELCOME));
            done();
        }, TIMEOUT);
    });

});