const { AppError } = require('../utils/appError');
const { log } = require('../utils/logger');
const { getPlayerRoom, getRoom, getPlayerRoomFromReservation } = require('./room.manager');
const matchEngine = require('./match.engine');

function startMatch(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  if (room.matchStatus === 'running') {
    throw new AppError('Match is already running', 400);
  }

  if (room.matchStatus === 'ended') {
    throw new AppError('Match has already ended', 400);
  }

  if (room.players.length < 1) {
    throw new AppError('At least one player is required to start a match', 400);
  }

  room.status = 'running';

  matchEngine.startMatch(room.roomId);

  log('INFO', '[MATCH] Started by player', {
    roomId: room.roomId,
    playerId,
    playerCount: room.players.length,
  });

  return { started: true, roomId: room.roomId };
}

function getMatchState(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  const state = matchEngine.getMatchState(room.roomId);
  if (!state) {
    throw new AppError('Match state not available', 500);
  }

  return state;
}

function getFullMatchState(playerId) {
  let room = getPlayerRoom(playerId);
  if (!room) {
    room = getPlayerRoomFromReservation(playerId);
  }
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  const state = matchEngine.getMatchState(room.roomId);

  const result = {
    match: state,
    room: {
      roomId: room.roomId,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      status: room.status,
      matchStatus: room.matchStatus,
    },
    scenarios: room.scenarios,
    activeInvestigations: room.activeInvestigations.map(inv => ({
      investigationId: inv.investigationId,
      playerId: inv.playerId,
      journalistId: inv.journalistId,
      scenarioId: inv.scenarioId,
      startedAt: inv.startedAt,
      estimatedCompletionAt: inv.estimatedCompletionAt,
      status: inv.status,
    })),
    completedInvestigations: room.completedInvestigations,
    leaderboard: room.matchSummary?.leaderboard || [],
    countdownRemaining: matchEngine.getCountdownRemaining ? matchEngine.getCountdownRemaining(room.roomId) : null,
    cityAssignments: room.cityAssignments,
  };

  return result;
}

module.exports = {
  startMatch,
  getMatchState,
  getFullMatchState,
};
