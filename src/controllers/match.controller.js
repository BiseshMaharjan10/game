const { asyncHandler } = require('../utils/asyncHandler');
const matchService = require('../services/match.service');

const startMatchHandler = asyncHandler(async (req, res) => {
  const result = matchService.startMatch(req.user.id);
  res.json(result);
});

const getMatchStateHandler = asyncHandler(async (req, res) => {
  const state = matchService.getMatchState(req.user.id);
  res.json({ match: state });
});

const getFullMatchStateHandler = asyncHandler(async (req, res) => {
  const state = matchService.getFullMatchState(req.user.id);
  res.json(state);
});

module.exports = {
  startMatchHandler,
  getMatchStateHandler,
  getFullMatchStateHandler,
};
