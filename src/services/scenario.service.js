const { AppError } = require('../utils/appError');
const { log } = require('../utils/logger');
const { getPlayerRoom, getRoom } = require('./room.manager');
const { generateScenario, getPublicScenario, getFullScenario } = require('./scenario.engine');

function findScenarioById(room, scenarioId) {
  return room.scenarios.find(s => s.scenarioId === scenarioId) || null;
}

function generateForRoom(roomId) {
  const room = getRoom(roomId);
  if (!room) {
    throw new AppError('Room not found', 404);
  }

  const scenario = generateScenario(roomId);

  log('INFO', 'Scenario generated', {
    roomId,
    scenarioId: scenario.scenarioId,
    category: scenario.category,
    truth: scenario.truth,
    templateId: scenario.templateId,
  });

  return scenario;
}

function getCurrentScenario(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  const active = room.scenarios.find(
    s => s.status === 'ACTIVE' || s.status === 'PUBLICATION_OPEN'
  );
  return active ? getPublicScenario(active) : null;
}

function getCurrentScenarioFull(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  const active = room.scenarios.find(
    s => s.status === 'ACTIVE' || s.status === 'PUBLICATION_OPEN'
  );
  return active ? getFullScenario(active) : null;
}

function expireScenario(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  const active = room.scenarios.find(
    s => s.status === 'ACTIVE' || s.status === 'PUBLICATION_OPEN'
  );
  if (!active) {
    throw new AppError('No active scenario', 400);
  }

  active.status = 'EXPIRED';
  log('INFO', 'Scenario expired', { roomId: room.roomId, scenarioId: active.scenarioId });
  return { expired: true };
}

function getScenarioHistory(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }

  return room.scenarios
    .filter(s => s.status === 'EXPIRED' || s.status === 'RESOLVED')
    .map(s => ({
      scenarioId: s.scenarioId,
      category: s.category,
      status: s.status,
      createdAt: s.createdAt,
    }));
}

module.exports = {
  generateForRoom,
  getCurrentScenario,
  getCurrentScenarioFull,
  expireScenario,
  getScenarioHistory,
  findScenarioById,
};
