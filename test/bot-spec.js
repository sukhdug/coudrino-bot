'use strict';

// testing tools
var chai = require('chai'),
    assert = chai.assert;
var sinon = require('sinon');
sinon.assert.expose(chai.assert, {prefix: ''});

// dependencies
var Messages = require('../src/messages');
var TelegramBot = require('node-telegram-bot-api');
var Bluebird = require('bluebird');
var extend = require('util')._extend;

// helper function to run the checks later
var later = function (fc) {
    setTimeout(fc, 500);
};

// constants
var CHAT_ID = 11111;
var ME = Object.freeze({
    id: 123456789,
    first_name: 'CoudrinoBot',
    username: 'CoudrinoBot'
});
var MESSAGE_OBJ = Object.freeze({
    message_id: 100,
    from: {
        id: 1234567,
        first_name: 'Test',
        last_name: 'User',
        username: 'user'
    },
    chat: {
        id: CHAT_ID,
        first_name: 'Test',
        last_name: 'User',
        username: 'user',
        type: 'private'
    },
    date: 1400000000,
    text: '/start'
});

/**
 * Simulate a new incoming message
 */
var simulateMessage = function (bot, command) {
    var msg = extend({}, MESSAGE_OBJ);
    msg.text = command;
    bot.emit('text', msg);
};

// inject a fake TOKEN for the bot
process.env.TOKEN = 'token';

// mock bot
sinon.stub(TelegramBot.prototype, 'getMe')
    .returns(new Bluebird(function (resolve) {
        resolve(ME);
    }));

// start the bot
var bot = require('../src/bot');


describe('bot', function () {

    // setup sinon
    beforeEach(function (done) {
        this.sinon = sinon.sandbox.create();

        // clear the db before the start of the test
        bot.reset().then(function () {
            done();
        });
    });
    afterEach(function () {
        this.sinon.restore();
    });

    describe('#getMe() [MOCK]', function () {
        it('it should return a promise with the mock value', function (done) {
            bot.getMe().then(function (me) {
                assert.equal(me, ME);
                done();
            });
        });
    });

    describe('/command@Bot', function () {
        it('it should execute the command without @Bot if it refers to this bot', function (done) {
            var sendMessage = this.sinon.spy(bot, 'sendMessage');
            simulateMessage(bot, '/start@' + ME.username);

            later(function () {
                assert.calledOnce(sendMessage);
                assert.calledWith(sendMessage, CHAT_ID, Messages.WELCOME);
                done();
            });
        });
        it('it should do nothing if the command does not refer to this bot', function (done) {
            var sendMessage = this.sinon.spy(bot, 'sendMessage');
            simulateMessage(bot, '/start@NotMe');

            later(function () {
                assert.notCalled(sendMessage);
                done();
            });
        });
    });

    describe('/start', function () {
        it('it should send a welcome message', function (done) {
            var sendMessage = this.sinon.spy(bot, 'sendMessage');
            simulateMessage(bot, '/start');

            later(function () {
                assert.calledOnce(sendMessage);
                assert.calledWith(sendMessage, CHAT_ID, Messages.WELCOME);
                done();
            });
        });
    });

    describe('/cancel', function () {
        it('should do nothing if there is no active command', function (done) {
            var sendMessage = this.sinon.spy(bot, 'sendMessage');
            simulateMessage(bot, '/cancel');

            later(function () {
                assert.calledOnce(sendMessage);
                assert.calledWith(sendMessage, CHAT_ID, Messages.NO_ACTIVE_COMMAND);
                done();
            });
        });

        it('should cancel the active command', function (done) {
            var self = this;

            // old state -> add email
            simulateMessage(bot, '/add');

            later(function () {
                var sendMessage = self.sinon.spy(bot, 'sendMessage');
                simulateMessage(bot, '/cancel');

                later(function () {
                    assert.calledOnce(sendMessage);
                    assert.calledWith(sendMessage, CHAT_ID, Messages.COMMAND_CANCELLED);
                    done();
                });
            });
        });
    });

    describe('default', function () {
        it('should return a help message if no command is found', function (done) {
            var sendMessage = this.sinon.spy(bot, 'sendMessage');
            simulateMessage(bot, '/nonExistingCommand');

            later(function () {
                assert.calledOnce(sendMessage);
                assert.calledWith(sendMessage, CHAT_ID, Messages.UNKNOWN_COMMAND);
                done();
            });
        });
    });

});