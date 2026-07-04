const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { debugModeRequired } = require('../../middleware/debugMode');
const {
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
} = require('../../controllers/debug.controller');

const debugRouter = Router();

debugRouter.use(debugModeRequired);
debugRouter.use(authRequired);

debugRouter.post('/add-bot', addBotHandler);
debugRouter.post('/remove-bot', removeBotHandler);
debugRouter.post('/fill-room', fillRoomHandler);
debugRouter.post('/start-match', startMatchHandler);
debugRouter.post('/skip-countdown', skipCountdownHandler);
debugRouter.post('/spawn-tip', spawnTipHandler);
debugRouter.post('/next-phase', nextPhaseHandler);
debugRouter.post('/end-match', endMatchHandler);
debugRouter.post('/set-time', setTimeHandler);
debugRouter.post('/set-scenario-time', setScenarioTimeHandler);
debugRouter.post('/reset-room', resetRoomHandler);

module.exports = { debugRouter };
