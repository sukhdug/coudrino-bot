'use strict';

function PositionNotFound() {
}
PositionNotFound.prototype = Object.create(Error.prototype);

module.exports = {
    PositionNotFound: PositionNotFound
};
