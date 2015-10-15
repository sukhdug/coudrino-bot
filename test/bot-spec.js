'use strict';

// testing tools
var chai = require('chai'),
    assert = chai.assert;
var sinon = require('sinon');
sinon.assert.expose(chai.assert, {prefix: ''});

// dependencies
var Messages = require('../src/messages');
var errors = require('../src/errors');
var CloudrinoClient = require('../src/clodrino-client');
var TelegramBot = require('node-telegram-bot-api');
var Bluebird = require('bluebird');
var extend = require('util')._extend;

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
 * Simulate a new incoming message.
 */
var simulateMessage = function (bot, command) {
    var msg = extend({}, MESSAGE_OBJ);
    msg.text = command;
    bot.emit('text', msg);
};

/**
 * Run a function after a small delay.
 */
var later = function (fc) {
    setTimeout(fc, 50);
};

/**
 * Verify a mock object after a certain amount of time.
 */
var check = function (mock, done) {
    later(function () {
        mock.verify();
        done();
    });
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


// spec
describe('bot', function () {

    beforeEach(function (done) {

        // clear the db before the start of the test
        bot.reset().then(function () {
            done();
        });

        // mock the bot
        this.mock = sinon.mock(bot);
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
            this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.WELCOME);
            simulateMessage(bot, '/start@' + ME.username);
            check(this.mock, done);
        });
        it('it should do nothing if the command does not refer to this bot', function (done) {
            this.mock.expects('sendMessage').never();
            simulateMessage(bot, '/start@NotMe');
            check(this.mock, done);
        });
    });

    describe('/start', function () {
        it('it should send a welcome message', function (done) {
            this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.WELCOME);
            simulateMessage(bot, '/start');
            check(this.mock, done);
        });
    });

    describe('/cancel', function () {
        it('should do nothing if there is no active command', function (done) {
            this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.NO_ACTIVE_COMMAND);
            simulateMessage(bot, '/cancel');
            check(this.mock, done);
        });
        it('should cancel the active command', function (done) {

            // old state -> add email
            this.mock.expects('sendMessage').once();
            simulateMessage(bot, '/add');

            // cancel the active command
            this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.COMMAND_CANCELLED);
            simulateMessage(bot, '/cancel');
            check(this.mock, done);
        });
    });

    describe('/add', function () {
        it('should add a new email address', function (done) {
            this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.ADD_EMAIL);
            simulateMessage(bot, '/add');
            this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.OK);
            simulateMessage(bot, 'new@example.com');
            check(this.mock, done);
        });
        it('should not add an already present email address', function (done) {

            var EMAIL = 'already-present@example.com';

            // insert an email
            simulateMessage(bot, '/add');
            simulateMessage(bot, EMAIL);
            this.mock.expects('sendMessage').twice();

            later(function () {

                // try to insert it again
                this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.ADD_EMAIL);
                simulateMessage(bot, '/add');
                this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.EMAIL_ALREADY_PRESENT);
                simulateMessage(bot, EMAIL);

                check(this.mock, done);
            }.bind(this));
        });
    });

    describe('/remove', function () {
        it('should should prompt a message if no email is present', function (done) {
            this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.NO_EMAILS);
            simulateMessage(bot, '/remove');
            check(this.mock, done);
        });
        it('should remove a present email', function (done) {

            var EMAIL = 'present@example.com';

            // insert an email
            simulateMessage(bot, '/add');
            simulateMessage(bot, EMAIL);
            this.mock.expects('sendMessage').twice();

            later(function () {

                // try to remove another one...
                this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.REMOVE_EMAIL);
                simulateMessage(bot, '/remove');

                later(function () {

                    // ... which is present
                    this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.OK);
                    simulateMessage(bot, EMAIL);

                    check(this.mock, done);

                }.bind(this));
            }.bind(this));
        });
        it('should not remove a non present email', function (done) {

            // insert an email
            simulateMessage(bot, '/add');
            simulateMessage(bot, 'test@example.com');
            this.mock.expects('sendMessage').twice();

            later(function () {

                // try to remove another one...
                this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.REMOVE_EMAIL);
                simulateMessage(bot, '/remove');

                later(function () {

                    // ... which is not present
                    this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.EMAIL_NOT_FOUND);
                    simulateMessage(bot, 'non-present@example.com');

                    check(this.mock, done);

                }.bind(this));
            }.bind(this));
        });
    });

    describe('/check', function () {
        it('should print a message if there is no email to check', function () {
            console.log('TODO... & to implement');
        });
        it('should check all the present emails', function (done) {

            var EMAIL_OK = 'ok@example.com';
            var EMAIL_KO = 'ko@example.com';

            // stub Cloudrino Client
            var getPositionStub = sinon.stub(CloudrinoClient.prototype, 'getPosition', function (email) {
                return new Bluebird(function (resolve, reject) {
                    switch (email) {
                        case EMAIL_OK:
                            resolve({
                                position: 300,
                                total: 50000
                            });
                            break;

                        default:
                            reject(new errors.PositionNotFound());
                    }
                });
            });

            // insert some emails
            simulateMessage(bot, '/add');
            simulateMessage(bot, EMAIL_OK);
            simulateMessage(bot, '/add');
            simulateMessage(bot, EMAIL_KO);
            this.mock.expects('sendMessage').exactly(4);

            later(function () {

                // ... and check them
                var messagges = ['ok@example.com -> #300 of #50000\n', 'ko@example.com -> not found\n'];
                var regexp = new RegExp('(' + messagges[0] + '|' + messagges[1] + '){2}');

                this.mock.expects('sendMessage').once().withArgs(CHAT_ID, sinon.match(regexp));
                simulateMessage(bot, '/check');

                check(this.mock, function () {
                    getPositionStub.restore();
                    done();
                });

            }.bind(this));
        });
    });

    describe('default', function () {
        it('should return a help message if no command is found', function (done) {
            this.mock.expects('sendMessage').once().withArgs(CHAT_ID, Messages.UNKNOWN_COMMAND);
            simulateMessage(bot, '/nonExistingCommand');
            check(this.mock, done);
        });
    });

});