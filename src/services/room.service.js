const { AppError } = require('../utils/appError');
const { log } = require('../utils/logger');
const {
  getRooms,
  getRoom,
  getPlayerRoom,
  addPlayerToRoom,
  removePlayerFromRoom,
  isRoomFull,
  getRoomPlayerCount,
  assignNextCity,
  removeCityAssignment,
  MAX_PLAYERS_PER_ROOM,
} = require('./room.manager');
const { newsRepository } = require('../modules/news/news.repository');
const { emitToRoom } = require('../websocket/wsServer');
const matchEngine = require('./match.engine');

function listRooms() {
  return getRooms().map(room => ({
    roomId: room.roomId,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
  }));
}

function joinRoom(playerId, roomId, playerName, companyName) {
  const existingRoom = getPlayerRoom(playerId);
  if (existingRoom) {
    log('INFO', 'Join rejected', {
      reason: 'Player already in another room',
      playerId,
      currentRoom: existingRoom.roomId,
      targetRoom: roomId,
    });
    throw new AppError('Already in a room. Leave current room first.', 400);
  }

  const room = getRoom(roomId);
  if (!room) {
    log('INFO', 'Join rejected', { reason: 'Room not found', playerId, roomId });
    throw new AppError('Room not found', 404);
  }

  if (room.status !== 'waiting') {
    log('INFO', 'Join rejected', {
      reason: 'Room is not waiting',
      playerId,
      roomId,
      status: room.status,
    });
    throw new AppError('Room is already running or ended', 400);
  }

  if (isRoomFull(roomId)) {
    log('INFO', 'Join rejected', { reason: 'Room is full', playerId, roomId });
    throw new AppError('Room is full', 400);
  }

  const player = { id: playerId, name: playerName || playerId, company: companyName || '' };
  addPlayerToRoom(roomId, player);

  const cityId = assignNextCity(roomId, playerId, player.name, player.company);
  if (cityId) {
    emitToRoom(roomId, 'city:assigned', {
      cityId,
      playerId,
      playerName: player.name,
      companyName: player.company,
    });
  }

  log('INFO', 'Player joined room', { playerId, roomId, cityId });

  const updatedRoom = getRoom(roomId);
  const playerCount = getRoomPlayerCount(roomId);

  emitToRoom(roomId, 'room:player_joined', {
    playerId,
    roomId,
    playerCount,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
  });

  emitToRoom(roomId, 'room:updated', {
    roomId,
    playerCount,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    status: updatedRoom?.status || 'waiting',
  });

  if (updatedRoom && updatedRoom.players.length >= updatedRoom.maxPlayers) {
    log('INFO', 'Room became full', { roomId, playerCount: updatedRoom.players.length });
  }

  if (playerCount >= 3 && updatedRoom && updatedRoom.matchStatus === 'idle') {
    matchEngine.startCountdown(roomId);
  }

  return { roomId, playerCount };
}

function leaveRoom(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  const roomId = room.roomId;
  const leavingPlayer = room.players.find(p => p.id === playerId);
  removePlayerFromRoom(playerId);
  const playerCount = getRoomPlayerCount(roomId);

  if (leavingPlayer) {
    emitToRoom(roomId, 'city:assigned', {
      cityId: 0,
      playerId,
      playerName: '',
      companyName: '',
      removed: true,
    });
  }
  log('INFO', 'Player left room', { playerId, roomId });

  if (playerCount < 3) {
    const roomState = getRoom(roomId);
    if (roomState && roomState.matchStatus === 'countdown') {
      matchEngine.cancelCountdown(roomId);
    }
  }

  emitToRoom(roomId, 'room:player_left', {
    playerId,
    roomId,
    playerCount,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
  });

  emitToRoom(roomId, 'room:updated', {
    roomId,
    playerCount,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    status: room.status,
  });

  if (playerCount === 0) {
    emitToRoom(roomId, 'room:deleted', { roomId });
  }

  return { roomId };
}

async function getCurrentRoom(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) return null;

  const publishedNews = await newsRepository.findByRoom(room.roomId);

  return {
    roomId: room.roomId,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
    publishedNews,
    activeEvents: room.activeEvents,
    leaderboard: room.leaderboard,
    remainingTime: room.remainingTime,
    gameState: room.gameState,
    createdAt: room.createdAt,
    gameStartTime: room.gameStartTime,
    cityAssignments: room.cityAssignments,
  };
}

module.exports = {
  listRooms,
  joinRoom,
  leaveRoom,
  getCurrentRoom,
};
