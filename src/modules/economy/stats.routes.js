const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { playerStatsHandler } = require('../../controllers/economy.controller');

const statsRouter = Router();

statsRouter.get('/', authRequired, playerStatsHandler);

module.exports = { statsRouter };
