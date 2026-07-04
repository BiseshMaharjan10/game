const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const {
  startMatchHandler,
  getMatchStateHandler,
  getFullMatchStateHandler,
} = require('../../controllers/match.controller');

const matchRouter = Router();

matchRouter.post('/start', authRequired, startMatchHandler);
matchRouter.get('/state', authRequired, getMatchStateHandler);
matchRouter.get('/full-state', authRequired, getFullMatchStateHandler);

module.exports = { matchRouter };
