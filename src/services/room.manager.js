const { log } = require('../utils/logger');

const ROOMS = new Map();
const playerRoomMap = new Map();
const disconnectedPlayers = new Map();
const DISCONNECT_TIMEOUT_MS = 60 * 1000;
const MAX_ROOMS = 5;
const MAX_PLAYERS_PER_ROOM = 5;

let disconnectCleanupInterval = null;

// ── Room initialization ──

function createRooms() {
  for (let i = 1; i <= MAX_ROOMS; i++) {
    ROOMS.set(i, {
      roomId: i,
      status: 'waiting',
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      players: [],
      activeEvents: [],
      scenarios: [],
      activeInvestigations: [],
      completedInvestigations: [],
      leaderboard: null,
      remainingTime: null,
      gameState: null,
      cityAssignments: [],
      createdAt: new Date().toISOString(),
      gameStartTime: null,
      matchStatus: 'idle',
      matchStartedAt: null,
      matchEndsAt: null,
    });
  }
  log('INFO', 'Room initialized', { rooms: MAX_ROOMS, capacity: MAX_PLAYERS_PER_ROOM });

  disconnectCleanupInterval = setInterval(clearExpiredReservations, 15 * 1000);
}

// ── Room accessors ──

function getRooms() {
  return Array.from(ROOMS.values());
}

function getRoom(roomId) {
  return ROOMS.get(roomId) || null;
}

function getPlayerRoom(playerId) {
  const roomId = playerRoomMap.get(playerId);
  if (!roomId) return null;
  return ROOMS.get(roomId) || null;
}

function addPlayerToRoom(roomId, player) {
  const room = ROOMS.get(roomId);
  if (!room) return null;
  room.players.push(player);
  playerRoomMap.set(player.id, roomId);
  return room;
}

function removePlayerFromRoom(playerId) {
  const roomId = playerRoomMap.get(playerId);
  if (!roomId) return null;
  const room = ROOMS.get(roomId);
  if (!room) return null;
  room.players = room.players.filter(p => p.id !== playerId);
  room.cityAssignments = room.cityAssignments.filter(a => a.playerId !== playerId);
  playerRoomMap.delete(playerId);
  return room;
}

function assignNextCity(roomId, playerId, playerName, companyName) {
  const room = ROOMS.get(roomId);
  if (!room) return null;
  const taken = new Set(room.cityAssignments.map(a => a.cityId));
  for (let i = 1; i <= MAX_PLAYERS_PER_ROOM; i++) {
    if (!taken.has(i)) {
      room.cityAssignments.push({ cityId: i, playerId, playerName, companyName: companyName || '' });
      return i;
    }
  }
  return null;
}

function removeCityAssignment(roomId, playerId) {
  const room = ROOMS.get(roomId);
  if (!room) return;
  room.cityAssignments = room.cityAssignments.filter(a => a.playerId !== playerId);
}

function isRoomFull(roomId) {
  const room = ROOMS.get(roomId);
  if (!room) return true;
  const reservedCount = _getReservedCount(roomId);
  return (room.players.length + reservedCount) >= MAX_PLAYERS_PER_ROOM;
}

function getRoomPlayerCount(roomId) {
  const room = ROOMS.get(roomId);
  return room ? room.players.length : 0;
}

// ── Disconnect reservation ──

function markPlayerDisconnected(playerId) {
  const roomId = playerRoomMap.get(playerId);
  if (!roomId) return false;

  disconnectedPlayers.set(playerId, {
    roomId,
    disconnectedAt: Date.now(),
  });

  log('INFO', '[ROOM] Player slot reserved', { playerId, roomId });
  return true;
}


function cancelDisconnectReservation(playerId) {
  disconnectedPlayers.delete(playerId);
}


function isPlayerReserved(playerId) {
  return disconnectedPlayers.has(playerId);
}


function restorePlayerFromReservation(playerId) {
  const entry = disconnectedPlayers.get(playerId);
  if (!entry) return null;

  const elapsed = Date.now() - entry.disconnectedAt;
  if (elapsed > DISCONNECT_TIMEOUT_MS) {
    disconnectedPlayers.delete(playerId);
    return null;
  }

  const room = ROOMS.get(entry.roomId);
  if (!room) {
    disconnectedPlayers.delete(playerId);
    return null;
  }

  room.players.push({ id: playerId });
  playerRoomMap.set(playerId, entry.roomId);
  disconnectedPlayers.delete(playerId);

  log('INFO', '[ROOM] Player restored from reservation', { playerId, roomId: entry.roomId });
  return room;
}


function getPlayerRoomFromReservation(playerId) {
  const entry = disconnectedPlayers.get(playerId);
  if (!entry) return null;
  if (Date.now() - entry.disconnectedAt > DISCONNECT_TIMEOUT_MS) {
    disconnectedPlayers.delete(playerId);
    return null;
  }
  return ROOMS.get(entry.roomId) || null;
}


function getPlayerDisconnectedRoomId(playerId) {
  const entry = disconnectedPlayers.get(playerId);
  return entry ? entry.roomId : null;
}


function clearExpiredReservations() {
  const now = Date.now();
  for (const [playerId, entry] of disconnectedPlayers) {
    if (now - entry.disconnectedAt > DISCONNECT_TIMEOUT_MS) {
      const room = ROOMS.get(entry.roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== playerId);
        room.cityAssignments = room.cityAssignments.filter(a => a.playerId !== playerId);
      }
      disconnectedPlayers.delete(playerId);
      playerRoomMap.delete(playerId);

      log('INFO', '[ROOM] Expired reservation cleaned up', {
        playerId,
        roomId: entry.roomId,
      });
    }
  }
}


function _getReservedCount(roomId) {
  let count = 0;
  for (const entry of disconnectedPlayers.values()) {
    if (entry.roomId === roomId) count++;
  }
  return count;
}


createRooms();

module.exports = {
  getRooms,
  getRoom,
  getPlayerRoom,
  addPlayerToRoom,
  removePlayerFromRoom,
  isRoomFull,
  getRoomPlayerCount,
  assignNextCity,
  removeCityAssignment,
  markPlayerDisconnected,
  cancelDisconnectReservation,
  isPlayerReserved,
  restorePlayerFromReservation,
  getPlayerRoomFromReservation,
  getPlayerDisconnectedRoomId,
  clearExpiredReservations,
  MAX_ROOMS,
  MAX_PLAYERS_PER_ROOM,
};
