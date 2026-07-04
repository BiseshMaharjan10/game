const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const {
  getCurrentScenarioHandler,
  getScenarioHistoryHandler,
} = require('../../controllers/scenario.controller');

const scenarioRouter = Router();

scenarioRouter.get('/current', authRequired, getCurrentScenarioHandler);
scenarioRouter.get('/history', authRequired, getScenarioHistoryHandler);

module.exports = { scenarioRouter };
