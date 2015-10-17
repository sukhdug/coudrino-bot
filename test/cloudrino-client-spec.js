'use strict';

var chai = require('chai'),
    assert = chai.assert;

// port to be used for the test
var PORT = process.env.TEST_PORT || 22222;

// dependencies
var CloudrinoClient = require('../src/clodrino-client');
var errors = require('../src/errors');
var express = require('express');
var app = express();

// fake emails
var Emails = {
    POS_500: 'pos-500-of-30000@example.com',
    NOT_EXISTING: 'not-existing@example.com',
    SIMULATE_ERROR: 'simulate-error@example.com'
};

// create fake cloudrino server
app.get('/*', function (req, res) {
    var email = req.originalUrl.replace('/', '');
    switch (email) {
        case Emails.POS_500:
            res.sendFile('pages/pos-500.html', {root: __dirname});
            break;

        case Emails.NOT_EXISTING:
            res.sendFile('pages/not-existing.html', {root: __dirname});
            break;

        default:
            res.status(400).send('Something broke!');
    }
});
app.listen(PORT);

// create client
var coudrino = new CloudrinoClient('http://localhost:' + PORT + '/');

// test cloudrino
describe('CloudrinoClient', function () {

    describe('#getPosition', function () {
        it('should return the right position if the email exists', function (done) {
            coudrino.getPosition(Emails.POS_500)
                .then(function (position) {
                    assert.deepEqual(position, {
                        position: '500',
                        total: '30000'
                    });
                    done();
                });
        });
        it('should throw an exception if the email does not exist', function (done) {
            coudrino.getPosition(Emails.NOT_EXISTING)
                .catch(errors.PositionNotFound, function () {
                    done();
                });
        });
        it('should handle cloudrino errors', function (done) {
            coudrino.getPosition(Emails.SIMULATE_ERROR)
                .catch(function (e) {
                    assert.notInstanceOf(e, errors.PositionNotFound);
                    done();
                });
        });
    });

});