const { asyncHandler } = require('../utils/asyncHandler');
const scenarioService = require('../services/scenario.service');

const getCurrentScenarioHandler = asyncHandler(async (req, res) => {
  const scenario = scenarioService.getCurrentScenario(req.user.id);
  res.json({ scenario });
});

const getScenarioHistoryHandler = asyncHandler(async (req, res) => {
  const history = scenarioService.getScenarioHistory(req.user.id);
  res.json({ history });
});

module.exports = {
  getCurrentScenarioHandler,
  getScenarioHistoryHandler,
};
