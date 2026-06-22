const { EventEmitter } = require('events');

const domainEvents = new EventEmitter();

module.exports = { domainEvents };