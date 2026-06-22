let io = null;

function setIO(instance) {
  io = instance;
}

function emitEvent(eventName, payload) {
  if (io) {
    io.emit(eventName, payload);
  }
}

module.exports = { setIO, emitEvent };