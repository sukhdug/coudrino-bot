'use strict';

var Messages = Object.freeze({
    WELCOME: 'Welcome! This simple bot allows to check the queue on Cloudrino\n\n Explain commands... TODO',

    ADD_EMAIL: 'Please, enter your email:',
    INVALID_EMAIL: 'The given email is not valid, please try again:',
    EMAIL_ALREADY_PRESENT: 'Email already present',

    COMMAND_CANCELLED: 'Command cancelled',
    NO_ACTIVE_COMMAND: 'No active command to cancel. I go back sleeping...',
    UNKNOWN_COMMAND: 'Unknown command',

    UNKNOWN_ERROR: 'Unknown error, probably Cloudrino has changed something...'
});

// export enum
module.exports = Messages;
