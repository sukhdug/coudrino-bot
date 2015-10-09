'use strict';

var chai = require('chai'),
    assert = chai.assert;

// dependencies
var RedisClient = require('../src/redis');
var redis = new RedisClient(process.env.REDIS_URL);
var Status = require('../src/status');

// fake chat to test
var CHAT = 111111111111111111111111111;

// test
describe('RedisClient', function () {

    // clear the DB before each test
    beforeEach(function (done) {
        redis.clear().then(function () {
            done();
        });
    });

    describe('#getStatus', function () {
        it('should return status default if no state was set', function (done) {
            redis.getStatus(CHAT)
                .then(function (status) {
                    assert.equal(status, Status.DEFAULT);
                    done();
                });
        });
        it('should return the previous status', function (done) {
            redis.setStatus(CHAT, Status.ADD_EMAIL)
                .then(function () {
                    return redis.getStatus(CHAT);
                })
                .then(function (status) {
                    assert.equal(status, Status.ADD_EMAIL);
                    done();
                });
        });
    });

    describe('#setStatus', function () {
        it('should set the new status', function (done) {
            redis.setStatus(CHAT, Status.ADD_EMAIL)
                .then(function () {
                    return redis.getStatus(CHAT);
                })
                .then(function (status) {
                    assert.equal(status, Status.ADD_EMAIL);
                })
                .then(function () {
                    return redis.setStatus(CHAT, Status.DEFAULT);
                })
                .then(function () {
                    return redis.getStatus(CHAT);
                })
                .then(function (status) {
                    assert.equal(status, Status.DEFAULT);
                    done();
                });
        });
    });

    describe('#addEmail', function () {
        it('should add a not existing email', function (done) {
            redis.addEmail(CHAT, 'not-existing@example.com')
                .then(function (added) {
                    // check if the email was added
                    assert.equal(added, true);
                })
                .then(function () {
                    return redis.getEmails(CHAT);
                })
                .then(function (emails) {
                    // check that the right email was added
                    var expected = ['not-existing@example.com'];
                    assert.sameMembers(emails, expected);
                    assert.equal(emails.length, expected.length);
                    done();
                });
        });
        it('should not add a not existing email', function (done) {
            redis.addEmail(CHAT, 'existing@example.com')
                .then(function () {
                    return redis.addEmail(CHAT, 'existing@example.com');
                })
                .then(function (addedSecond) {
                    // check if the email was not added
                    assert.equal(addedSecond, false);
                })
                .then(function () {
                    return redis.getEmails(CHAT);
                })
                .then(function (emails) {
                    // check that the right email was added
                    var expected = ['existing@example.com'];
                    assert.sameMembers(emails, expected);
                    assert.equal(emails.length, expected.length);
                    done();
                });
        });
        it('should work with more than 1 email', function (done) {
            var expected = ['first@example.com', 'second@example.com', 'third@example.com'];
            redis.addEmail(CHAT, expected[0])
                .then(function () {
                    return redis.addEmail(CHAT, expected[1]);
                })
                .then(function () {
                    return redis.addEmail(CHAT, expected[1]);
                })
                .then(function () {
                    return redis.addEmail(CHAT, expected[2]);
                })
                .then(function () {
                    return redis.getEmails(CHAT);
                })
                .then(function (emails) {
                    assert.sameMembers(emails, expected);
                    assert.equal(emails.length, expected.length);
                    done();
                });
        });
    });

    describe('#getEmails', function () {
        it('should return [] if no email was added', function (done) {
            redis.getEmails(CHAT)
                .then(function (emails) {
                    assert.equal(emails.length, 0);
                    done();
                });
        });
    });

});