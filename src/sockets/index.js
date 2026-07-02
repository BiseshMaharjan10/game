const { Server } = require('socket.io');
const { AppError } = require('../utils/appError');
const { publishArticle } = require('../services/article.service');
const { hireCharacter } = require('../services/journalist.service');
const { acceptEvent } = require('../services/event.service');
const { domainEvents } = require('../events');
const { verifyAccessToken } = require('../config/jwt');
const { prisma } = require('../config/prisma');
const { buildCorsOptions } = require('../utils/cors');

let io = null;

function getSocketRoom(playerId) {
  return `player:${playerId}`;
}

function bindDomainEvents() {
  domainEvents.removeAllListeners('coins.updated');
  domainEvents.removeAllListeners('trust.updated');
  domainEvents.removeAllListeners('gems.updated');
  domainEvents.removeAllListeners('leaderboard.updated');
  domainEvents.removeAllListeners('event.created');

  domainEvents.on('coins.updated', (payload) => io?.to(getSocketRoom(payload.playerId)).emit('coins_updated', payload));
  domainEvents.on('trust.updated', (payload) => io?.to(getSocketRoom(payload.playerId)).emit('trust_updated', payload));
  domainEvents.on('gems.updated', (payload) => io?.to(getSocketRoom(payload.playerId)).emit('gems_updated', payload));
  domainEvents.on('leaderboard.updated', (payload) => io?.emit('leaderboard_updated', payload));
  domainEvents.on('event.created', (payload) => io?.emit('event_created', payload));
}

function initSocket(server) {
  io = new Server(server, {
    cors: buildCorsOptions()
  });

  bindDomainEvents();

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new AppError('Unauthorized', 401);
      }

      const decoded = verifyAccessToken(token);
      const player = await prisma.player.findUnique({ where: { id: decoded.id } });

      if (!player) {
        throw new AppError('Unauthorized', 401);
      }

      socket.data.user = {
        id: player.id,
        companyName: player.companyName,
        email: player.email
      };
      next();
    } catch (error) {
      next(new AppError('Invalid or expired token', 401));
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

    socket.on('hire_character', async (payload, ack = () => {}) => {
      const tag = '[socket:hire_character]';
      console.log(`${tag} payload=`, payload, 'user.id=', socket.data.user.id);
      try {
        const characterId = payload.characterId || payload.character || payload.name;
        const purchaseType = payload.purchaseType || 'gems';
        console.log(`${tag} characterId=${characterId} purchaseType=${purchaseType}`);
        const result = await hireCharacter(socket.data.user.id, characterId, purchaseType);
        console.log(`${tag} success coins=${result.coins} gems=${result.gems}`);
        ack({ ok: true, data: result });
      } catch (error) {
        console.error(`${tag} error=`, error);
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
