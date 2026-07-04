const { asyncHandler } = require('../utils/asyncHandler');
const debugService = require('../services/debug.service');

const addBotHandler = asyncHandler(async (req, res) => {
  const result = debugService.addBot(req.user.id);
  res.json({ message: 'Bot Added', ...result });
});

const removeBotHandler = asyncHandler(async (req, res) => {
  const result = debugService.removeBot(req.user.id);
  res.json({ message: 'Bot Removed', ...result });
});

const fillRoomHandler = asyncHandler(async (req, res) => {
  const result = debugService.fillRoom(req.user.id);
  res.json({ message: 'Room Filled', ...result });
});

const startMatchHandler = asyncHandler(async (req, res) => {
  const result = debugService.startMatch(req.user.id);
  res.json({ message: 'Countdown Started', ...result });
});

const skipCountdownHandler = asyncHandler(async (req, res) => {
  const result = debugService.skipCountdown(req.user.id);
  res.json({ message: 'Match Started', ...result });
});

const spawnTipHandler = asyncHandler(async (req, res) => {
  const result = debugService.spawnTip(req.user.id);
  res.json({ message: 'Scenario Spawned', ...result });
});

const nextPhaseHandler = asyncHandler(async (req, res) => {
  const result = debugService.nextPhase(req.user.id);
  res.json({ message: 'Next Phase', ...result });
});

const endMatchHandler = asyncHandler(async (req, res) => {
  const result = await debugService.endMatch(req.user.id);
  res.json({ message: 'Match Ended', ...result });
});

const setTimeHandler = asyncHandler(async (req, res) => {
  const seconds = parseInt(req.body.secondsRemaining, 10);
  if (isNaN(seconds) || seconds < 1) {
    return res.status(400).json({ error: 'secondsRemaining must be a positive number' });
  }
  const result = debugService.setTime(req.user.id, seconds);
  res.json({ message: 'Time Set', ...result });
});

const setScenarioTimeHandler = asyncHandler(async (req, res) => {
  const scenarioId = req.body.scenarioId;
  const seconds = parseInt(req.body.secondsRemaining, 10);
  if (!scenarioId || typeof scenarioId !== 'string') {
    return res.status(400).json({ error: 'scenarioId is required' });
  }
  if (isNaN(seconds) || seconds < 1) {
    return res.status(400).json({ error: 'secondsRemaining must be a positive number' });
  }
  const result = debugService.setScenarioTime(req.user.id, scenarioId, seconds);
  res.json({ message: 'Scenario Time Set', ...result });
});

const resetRoomHandler = asyncHandler(async (req, res) => {
  const result = debugService.resetRoom(req.user.id);
  res.json({ message: 'Room Reset', ...result });
});

module.exports = {
  addBotHandler,
  removeBotHandler,
  fillRoomHandler,
  startMatchHandler,
  skipCountdownHandler,
  spawnTipHandler,
  nextPhaseHandler,
  endMatchHandler,
  setTimeHandler,
  setScenarioTimeHandler,
  resetRoomHandler,
};
