'use strict';

// setup redis to user Promises (bluebird library)
var redis = require('redis');
var bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

// dependencies
var Status = require('./status');

// constants
var STATUS = 'status_';
var EMAILS = 'emails_';

// constructor
var RedisClient = function (url) {
    this.client = redis.createClient(url);
};

RedisClient.prototype.clear = function () {
    return this.client.flushallAsync();
};

RedisClient.prototype.getStatus = function (chat) {
    return this.client.getAsync(STATUS + chat).then(function (status) {
        return status || Status.DEFAULT;
    });
};

RedisClient.prototype.setStatus = function (chat, status) {
    return this.client.setAsync(STATUS + chat, status);
};

RedisClient.prototype.addEmail = function (user, email) {
    return this.client.saddAsync(EMAILS + user, email).then(function (number) {
        return number ? true : false;
    });
};

RedisClient.prototype.removeEmail = function (user, email) {
    return this.client.sremAsync(EMAILS + user, email).then(function (number) {
        return number ? true : false;
    });
};

RedisClient.prototype.getEmails = function (user) {
    return this.client.smembersAsync(EMAILS + user);
};

// export "class"
module.exports = RedisClient;
