const { AppError } = require('../utils/appError');
const { log } = require('../utils/logger');
const { getPlayerRoom, getRoom } = require('./room.manager');
const { getCharacterStats } = require('../data/characterStats');
const { createInvestigation, completeInvestigation } = require('./investigation.engine');
const { characterRepository } = require('../modules/journalists/journalists.repository');
const { findScenarioById } = require('./scenario.service');
const { emitToRoom } = require('../websocket/wsServer');

const timerMap = new Map();

function _isJournalistBusy(room, playerId, journalistId) {
  return room.activeInvestigations.some(
    inv => inv.playerId === playerId && inv.journalistId === journalistId && inv.status === 'active'
  );
}

async function startInvestigation(playerId, scenarioId, journalistId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  const scenario = findScenarioById(room, scenarioId);
  if (!scenario) {
    throw new AppError('Scenario not found in this room', 404);
  }

  if (scenario.status !== 'ACTIVE') {
    throw new AppError('Investigation period has ended for this scenario', 400);
  }

  const stats = getCharacterStats(journalistId);
  if (!stats) {
    throw new AppError('Unknown journalist: ' + journalistId, 400);
  }

  const owned = await characterRepository.findByPlayerAndId(playerId, journalistId);
  if (!owned || owned.quantity < 1) {
    throw new AppError('You do not own this journalist', 400);
  }

  if (_isJournalistBusy(room, playerId, journalistId)) {
    throw new AppError('This journalist is already investigating', 400);
  }

  const { investigation, duration } = createInvestigation(
    room.roomId, playerId, journalistId, scenarioId, stats
  );

  room.activeInvestigations.push(investigation);

  const timer = setTimeout(() => {
    _processCompletion(investigation, room, stats);
  }, duration);

  timerMap.set(investigation.investigationId, timer);

  emitToRoom(room.roomId, 'investigation:started', {
    investigationId: investigation.investigationId,
    scenarioId,
    journalistId,
    playerId,
    estimatedCompletionAt: investigation.estimatedCompletionAt,
  });

  const journoName = _getJournalistName(journalistId);
  emitToRoom(room.roomId, 'activity:message', {
    type: 'investigation_started',
    playerId,
    journalistName: journoName,
    message: `${journoName} began investigating a lead`,
    roomId: room.roomId,
  });

  log('INFO', '[INVESTIGATION] Journalist busy', {
    roomId: room.roomId,
    playerId,
    journalistId,
    investigationId: investigation.investigationId,
  });

  return {
    investigationId: investigation.investigationId,
    estimatedCompletionAt: investigation.estimatedCompletionAt,
  };
}

function _getJournalistName(journalistId) {
  const names = {
    'journalist_1': 'Sarah Chen',
    'journalist_2': 'Marcus Webb',
    'journalist_3': 'Elena Voss',
    'journalist_4': 'Detective Cole',
    'journalist_5': 'Nina Roy',
  };
  return names[journalistId] || journalistId;
}

function _processCompletion(investigation, room, stats) {
  const scenario = findScenarioById(room, investigation.scenarioId);
  if (!scenario) {
    investigation.status = 'cancelled';
    log('WARN', '[INVESTIGATION] Scenario no longer exists, investigation cancelled', {
      investigationId: investigation.investigationId,
    });
    return;
  }

  const result = completeInvestigation(investigation, scenario, stats);

  const idx = room.activeInvestigations.findIndex(
    inv => inv.investigationId === investigation.investigationId
  );
  if (idx !== -1) {
    room.activeInvestigations.splice(idx, 1);
  }

  room.completedInvestigations.push(result);

  timerMap.delete(investigation.investigationId);

  emitToRoom(room.roomId, 'investigation:completed', {
    investigationId: result.investigationId,
    scenarioId: result.scenarioId,
    playerId: result.playerId,
    journalistId: result.journalistId,
    completedAt: result.completedAt,
    confidenceScore: result.confidenceScore,
    evidenceFound: result.discoveredEvidence.length,
    witnessesFound: result.discoveredWitnesses.length,
  });

  const journoName = _getJournalistName(result.journalistId);
  emitToRoom(room.roomId, 'activity:message', {
    type: 'investigation_completed',
    playerId: result.playerId,
    journalistName: journoName,
    message: `${journoName} completed an investigation (confidence: ${result.confidenceScore})`,
    confidenceScore: result.confidenceScore,
    evidenceFound: result.discoveredEvidence.length,
    witnessesFound: result.discoveredWitnesses.length,
    roomId: room.roomId,
  });

  log('INFO', '[INVESTIGATION] Journalist available again', {
    roomId: room.roomId,
    playerId: investigation.playerId,
    journalistId: investigation.journalistId,
    investigationId: investigation.investigationId,
  });
}

function getCurrentInvestigations(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  const active = room.activeInvestigations.filter(inv => inv.playerId === playerId).map(inv => ({
    investigationId: inv.investigationId,
    journalistId: inv.journalistId,
    scenarioId: inv.scenarioId,
    startedAt: inv.startedAt,
    estimatedCompletionAt: inv.estimatedCompletionAt,
    status: inv.status,
  }));

  return active;
}

function getCompletedInvestigations(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  const completed = room.completedInvestigations.filter(inv => inv.playerId === playerId);

  return completed;
}

module.exports = {
  startInvestigation,
  getCurrentInvestigations,
  getCompletedInvestigations,
};
