const { AppError } = require('../utils/appError');
const { log } = require('../utils/logger');
const {
  getPlayerRoom,
  getRoom,
  addPlayerToRoom,
  removePlayerFromRoom,
  isRoomFull,
  getRoomPlayerCount,
  assignNextCity,
  removeCityAssignment,
  MAX_PLAYERS_PER_ROOM,
} = require('./room.manager');
const matchEngine = require('./match.engine');
const { emitToRoom } = require('../websocket/wsServer');

let _botCounter = 0;

function _nextBotId() {
  _botCounter++;
  return `bot_${_botCounter}`;
}

function _nextBotName() {
  return `Reporter${String(_botCounter).padStart(2, '0')}`;
}

function _findRoomForPlayer(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) throw new AppError('Not in any room', 400);
  return room;
}

function addBot(playerId) {
  const room = _findRoomForPlayer(playerId);
  if (room.status !== 'waiting') throw new AppError('Room is not in waiting state', 400);
  if (isRoomFull(room.roomId)) throw new AppError('Room is full', 400);

  const botId = _nextBotId();
  const botName = _nextBotName();
  const bot = { id: botId, isBot: true, name: botName };

  addPlayerToRoom(room.roomId, bot);

  const playerCount = room.players.length;

  const cityId = assignNextCity(room.roomId, botId, botName, '');
  if (cityId) {
    emitToRoom(room.roomId, 'city:assigned', {
      cityId,
      playerId: botId,
      playerName: botName,
      companyName: '',
    });
  }

  emitToRoom(room.roomId, 'room:player_joined', {
    playerId: botId,
    roomId: room.roomId,
    playerCount,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    isBot: true,
    botName,
  });

  emitToRoom(room.roomId, 'room:updated', {
    roomId: room.roomId,
    playerCount,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    status: room.status,
  });

  if (playerCount >= 3 && room.matchStatus === 'idle') {
    matchEngine.startCountdown(room.roomId);
  }

  log('INFO', '[DEBUG] Bot added', { roomId: room.roomId, botId, botName });

  return { botId, botName, playerCount };
}

function removeBot(playerId) {
  const room = _findRoomForPlayer(playerId);

  const bots = room.players.filter(p => p.isBot);
  if (bots.length === 0) throw new AppError('No bots to remove', 400);

  const bot = bots[bots.length - 1];
  removePlayerFromRoom(bot.id);

  emitToRoom(room.roomId, 'city:assigned', {
    cityId: 0,
    playerId: bot.id,
    playerName: '',
    companyName: '',
    removed: true,
  });

  const playerCount = room.players.length;

  if (playerCount < 3 && room.matchStatus === 'countdown') {
    matchEngine.cancelCountdown(room.roomId);
  }

  emitToRoom(room.roomId, 'room:player_left', {
    playerId: bot.id,
    roomId: room.roomId,
    playerCount,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    isBot: true,
  });

  emitToRoom(room.roomId, 'room:updated', {
    roomId: room.roomId,
    playerCount,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    status: room.status,
  });

  log('INFO', '[DEBUG] Bot removed', { roomId: room.roomId, botId: bot.id });

  return { removedBotId: bot.id, playerCount };
}

function fillRoom(playerId) {
  const room = _findRoomForPlayer(playerId);
  if (room.status !== 'waiting') throw new AppError('Room is not in waiting state', 400);

  const needed = Math.max(0, 3 - room.players.length);
  const added = [];

  for (let i = 0; i < needed; i++) {
    if (isRoomFull(room.roomId)) break;
    const botId = _nextBotId();
    const botName = _nextBotName();
    const bot = { id: botId, isBot: true, name: botName };
    addPlayerToRoom(room.roomId, bot);
    added.push({ botId, botName });

    const cityId = assignNextCity(room.roomId, botId, botName, '');
    if (cityId) {
      emitToRoom(room.roomId, 'city:assigned', {
        cityId,
        playerId: botId,
        playerName: botName,
        companyName: '',
      });
    }

    emitToRoom(room.roomId, 'room:player_joined', {
      playerId: botId,
      roomId: room.roomId,
      playerCount: room.players.length,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      isBot: true,
      botName,
    });
  }

  emitToRoom(room.roomId, 'room:updated', {
    roomId: room.roomId,
    playerCount: room.players.length,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    status: room.status,
  });

  if (room.players.length >= 3 && room.matchStatus === 'idle') {
    matchEngine.startCountdown(room.roomId);
  }

  log('INFO', '[DEBUG] Room filled', { roomId: room.roomId, added: added.length });

  return { added, playerCount: room.players.length };
}

function startMatch(playerId) {
  const room = _findRoomForPlayer(playerId);
  if (room.matchStatus !== 'idle') throw new AppError('Match is not idle', 400);
  matchEngine.startCountdown(room.roomId);
  log('INFO', '[DEBUG] Countdown started', { roomId: room.roomId });
  return { started: true, type: 'countdown', roomId: room.roomId };
}

function skipCountdown(playerId) {
  const room = _findRoomForPlayer(playerId);
  if (room.matchStatus === 'running') throw new AppError('Match already running', 400);
  if (room.matchStatus === 'ended') throw new AppError('Match already ended', 400);
  matchEngine.startMatch(room.roomId);
  log('INFO', '[DEBUG] Match started (countdown skipped)', { roomId: room.roomId });
  return { started: true, type: 'match', roomId: room.roomId };
}

function spawnTip(playerId) {
  const room = _findRoomForPlayer(playerId);
  const nextNumber = matchEngine.forceSpawnScenario(room.roomId);
  if (!nextNumber) throw new AppError('Could not spawn scenario', 500);
  log('INFO', '[DEBUG] Scenario spawned', { roomId: room.roomId, scenarioNumber: nextNumber });
  return { spawned: true, scenarioNumber: nextNumber };
}

function nextPhase(playerId) {
  const room = _findRoomForPlayer(playerId);
  const active = room.scenarios.find(
    s => s.status === 'ACTIVE' || s.status === 'PUBLICATION_OPEN'
  );
  if (active) {
    matchEngine.expireScenarioById(room.roomId, active.scenarioId);
  }
  const nextNumber = matchEngine.forceSpawnScenario(room.roomId);
  log('INFO', '[DEBUG] Next phase triggered', { roomId: room.roomId });
  return { expired: !!active, spawned: true, scenarioNumber: nextNumber };
}

async function endMatch(playerId) {
  const room = _findRoomForPlayer(playerId);
  if (room.matchStatus !== 'running') throw new AppError('Match is not running', 400);
  await matchEngine.endMatch(room.roomId);
  log('INFO', '[DEBUG] Match ended', { roomId: room.roomId });
  return { ended: true, roomId: room.roomId };
}

function setTime(playerId, secondsRemaining) {
  const room = _findRoomForPlayer(playerId);
  if (room.matchStatus !== 'running') throw new AppError('Match is not running', 400);
  const remainingMs = Math.max(1000, secondsRemaining * 1000);
  matchEngine.resetMatchTimer(room.roomId, remainingMs);
  log('INFO', '[DEBUG] Match time set', { roomId: room.roomId, secondsRemaining });
  return { set: true, remainingMs, roomId: room.roomId };
}

function setScenarioTime(playerId, scenarioId, secondsRemaining) {
  const room = _findRoomForPlayer(playerId);
  const remainingMs = Math.max(1000, secondsRemaining * 1000);
  const changed = matchEngine.changeScenarioTime(room.roomId, scenarioId, remainingMs);
  if (!changed) throw new AppError('Scenario not found', 404);
  log('INFO', '[DEBUG] Scenario time set', { roomId: room.roomId, scenarioId, secondsRemaining });
  return { set: true, scenarioId, remainingMs };
}

function resetRoom(playerId) {
  const room = _findRoomForPlayer(playerId);
  const roomId = room.roomId;

  room.status = 'waiting';
  room.matchStatus = 'idle';
  room.matchCountdownStartedAt = null;
  room.matchStartedAt = null;
  room.matchEndsAt = null;
  room.scenarios = [];
  room.activeInvestigations = [];
  room.completedInvestigations = [];
  room.leaderboard = null;
  room.remainingTime = null;
  room.gameState = null;
  room.matchSummary = null;

  // Remove all bots, keep real players
  room.players = room.players.filter(p => !p.isBot);
  room.cityAssignments = room.cityAssignments.filter(a => {
    const player = room.players.find(p => p.id === a.playerId);
    return !!player;
  });

  emitToRoom(roomId, 'room:updated', {
    roomId,
    playerCount: room.players.length,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    status: 'waiting',
  });

  emitToRoom(roomId, 'match:countdown_cancelled', { roomId });

  log('INFO', '[DEBUG] Room reset', { roomId, remainingPlayers: room.players.length });

  return { reset: true, roomId, playerCount: room.players.length };
}

module.exports = {
  addBot,
  removeBot,
  fillRoom,
  startMatch,
  skipCountdown,
  spawnTip,
  nextPhase,
  endMatch,
  setTime,
  setScenarioTime,
  resetRoom,
};
