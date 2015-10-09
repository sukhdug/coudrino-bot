'use strict';

var assert = require("assert");

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
});