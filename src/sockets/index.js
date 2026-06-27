const { Server } = require('socket.io');
const { AppError } = require('../utils/appError');
const { publishArticle } = require('../services/article.service');
const { hireJournalist } = require('../services/journalist.service');
const { acceptEvent } = require('../services/event.service');
const { domainEvents } = require('../events');
const { verifyFirebaseToken } = require('../config/firebase');
const { prisma } = require('../config/prisma');

let io = null;

function getSocketRoom(playerId) {
  return `player:${playerId}`;
}

function bindDomainEvents() {
  domainEvents.removeAllListeners('money.updated');
  domainEvents.removeAllListeners('trust.updated');
  domainEvents.removeAllListeners('subscriber.updated');
  domainEvents.removeAllListeners('leaderboard.updated');
  domainEvents.removeAllListeners('event.created');

  domainEvents.on('money.updated', (payload) => io?.to(getSocketRoom(payload.playerId)).emit('money_updated', payload));
  domainEvents.on('trust.updated', (payload) => io?.to(getSocketRoom(payload.playerId)).emit('trust_updated', payload));
  domainEvents.on('subscriber.updated', (payload) => io?.to(getSocketRoom(payload.playerId)).emit('subscriber_updated', payload));
  domainEvents.on('leaderboard.updated', (payload) => io?.emit('leaderboard_updated', payload));
  domainEvents.on('event.created', (payload) => io?.emit('event_created', payload));
}

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || true,
      credentials: true
    }
  });

  bindDomainEvents();

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new AppError('Unauthorized', 401);
      }

      const decodedToken = await verifyFirebaseToken(token);
      const player = await prisma.player.findUnique({ where: { firebaseUid: decodedToken.uid } });

      if (!player) {
        throw new AppError('Unauthorized', 401);
      }

      socket.data.user = {
        id: player.id,
        username: player.username,
        email: player.email
      };
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    socket.join(getSocketRoom(socket.data.user.id));

    socket.on('publish_article', async (payload, ack = () => {}) => {
      try {
        const result = await publishArticle(socket.data.user.id, payload);
        ack({ ok: true, data: result });
      } catch (error) {
        ack({ ok: false, error: error.message });
      }
    });

    socket.on('hire_journalist', async (payload, ack = () => {}) => {
      try {
        const result = await hireJournalist(socket.data.user.id, payload);
        ack({ ok: true, data: result });
      } catch (error) {
        ack({ ok: false, error: error.message });
      }
    });

    socket.on('accept_event', async (payload, ack = () => {}) => {
      try {
        const result = await acceptEvent(socket.data.user.id, payload);
        ack({ ok: true, data: result });
      } catch (error) {
        ack({ ok: false, error: error.message });
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
