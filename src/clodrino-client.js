'use strict';

// dependencies
var bluebird = require('bluebird');
var request = bluebird.promisify(require('request'));
var errors = require('./errors');

var CloudrinoClient = function () {
    this.address = 'https://www.cloudrino.net/index.php?error=1&email=';
};

CloudrinoClient.prototype._transformResponse = function (body) {
    var result = /#(\d+) of #(\d+)/.exec(body);
    if (!result) {
        throw new errors.PositionNotFound();
    }
    return {
        position: result[1],
        total: result[2]
    };
};

CloudrinoClient.prototype._doRequest = function (email) {
    var options = {
        uri: this.address + email,
        method: 'GET'
    };

    return request(options);
};

CloudrinoClient.prototype.getPosition = function (email) {
    var self = this;
    return self._doRequest(email)
        .then(function (body) {
            return self._transformResponse(body);
        });
};


// export "class"
module.exports = CloudrinoClient;
