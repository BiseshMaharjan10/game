const { WebSocketServer } = require('ws');
const { verifyAccessToken } = require('../config/jwt');
const { prisma } = require('../config/prisma');
const { log } = require('../utils/logger');
const {
  markPlayerDisconnected,
  isPlayerReserved,
  restorePlayerFromReservation,
  cancelDisconnectReservation,
  getRoom,
} = require('../services/room.manager');
const MAX_PLAYERS_PER_ROOM = 5;

const WS_PATH = '/ws';
const HEARTBEAT_INTERVAL_MS = 15000;
const PONG_TIMEOUT_MS = 5000;

const clients = new Map();
const roomSubscriptions = new Map();

let wss = null;

function initWsServer(server) {
  wss = new WebSocketServer({ server, path: WS_PATH });

  wss.on('connection', async (ws, req) => {
    const base = req.headers.host ? `http://${req.headers.host}` : 'http://localhost';
    const url = new URL(req.url, base);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }

    let player;
    try {
      const decoded = verifyAccessToken(token);
      player = await prisma.player.findUnique({ where: { id: decoded.id } });
      if (!player) {
        ws.close(4001, 'Player not found');
        return;
      }
    } catch (err) {
      ws.close(4001, 'Invalid or expired token');
      return;
    }

    const playerId = player.id;
    ws.playerId = playerId;
    ws.isAlive = true;
    ws.subscribedRooms = new Set();

    const wasReserved = isPlayerReserved(playerId);
    if (wasReserved) {
      cancelDisconnectReservation(playerId);
    }

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case 'subscribe':
          _handleSubscribe(ws, msg);
          break;
        case 'unsubscribe':
          _handleUnsubscribe(ws, msg);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    });

    ws.on('close', () => {
      _handleDisconnect(playerId);
    });

    ws.on('error', () => {
      _handleDisconnect(playerId);
    });

    clients.set(playerId, ws);

    if (wasReserved) {
      const restored = restorePlayerFromReservation(playerId);
      if (restored) {
        log('INFO', '[WS] Player reconnected — restored to room', { playerId, roomId: restored.roomId });
        ws.send(JSON.stringify({
          type: 'connected',
          payload: { playerId, reconnected: true },
        }));
        emitToRoom(restored.roomId, 'player:reconnected', { playerId, roomId: restored.roomId });
        return;
      }
    }

    ws.send(JSON.stringify({
      type: 'connected',
      payload: { playerId },
    }));

    log('INFO', '[WS] Client connected', { playerId });
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        _handleDisconnect(ws.playerId);
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  log('INFO', '[WS] WebSocket server initialized', { path: WS_PATH });
  return wss;
}

function _handleSubscribe(ws, msg) {
  const room = msg.room;
  if (!room) return;

  if (!roomSubscriptions.has(room)) {
    roomSubscriptions.set(room, new Set());
  }
  roomSubscriptions.get(room).add(ws.playerId);
  ws.subscribedRooms.add(room);

  if (room.startsWith('room:')) {
    const roomId = parseInt(room.split(':')[1], 10);
    if (!isNaN(roomId)) {
      const roomData = getRoom(roomId);
      if (roomData) {
        ws.send(JSON.stringify({
          event: 'room:state',
          payload: {
            roomId: roomData.roomId,
            playerCount: roomData.players.length,
            maxPlayers: MAX_PLAYERS_PER_ROOM,
            status: roomData.status,
            matchStatus: roomData.matchStatus,
            matchCountdownStartedAt: roomData.matchCountdownStartedAt,
            matchStartedAt: roomData.matchStartedAt,
            matchEndsAt: roomData.matchEndsAt,
            cityAssignments: roomData.cityAssignments,
          },
        }));
      }
    }
  }

  log('INFO', '[WS] Player subscribed', { playerId: ws.playerId, room });
}

function _handleUnsubscribe(ws, msg) {
  const room = msg.room;
  if (!room) return;

  const subs = roomSubscriptions.get(room);
  if (subs) {
    subs.delete(ws.playerId);
    if (subs.size === 0) {
      roomSubscriptions.delete(room);
    }
  }
  ws.subscribedRooms.delete(room);
}

function _handleDisconnect(playerId) {
  const ws = clients.get(playerId);
  if (ws) {
    for (const room of ws.subscribedRooms) {
      const subs = roomSubscriptions.get(room);
      if (subs) {
        subs.delete(playerId);
        if (subs.size === 0) {
          roomSubscriptions.delete(room);
        }
      }
    }
    clients.delete(playerId);
  }

  markPlayerDisconnected(playerId);

  log('INFO', '[WS] Client disconnected', { playerId });
}

function emitToRoom(roomId, event, payload) {
  const roomKey = `room:${roomId}`;
  const subs = roomSubscriptions.get(roomKey);
  if (!subs || subs.size === 0) return;

  const message = JSON.stringify({ event, payload });
  for (const playerId of subs) {
    const ws = clients.get(playerId);
    if (ws && ws.readyState === 1) {
      ws.send(message);
    }
  }
}

function emitToPlayer(playerId, event, payload) {
  const ws = clients.get(playerId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ event, payload }));
  }
}

function emitToAll(event, payload) {
  const message = JSON.stringify({ event, payload });
  for (const ws of clients.values()) {
    if (ws.readyState === 1) {
      ws.send(message);
    }
  }
}

function getConnectedPlayerIds() {
  return Array.from(clients.keys());
}

module.exports = {
  initWsServer,
  emitToRoom,
  emitToPlayer,
  emitToAll,
  getConnectedPlayerIds,
};
