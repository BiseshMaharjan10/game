const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { economyHandler, economyStatsHandler } = require('../../controllers/economy.controller');

const economyRouter = Router();

economyRouter.get('/', authRequired, economyHandler);
economyRouter.get('/stats', authRequired, economyStatsHandler);

module.exports = { economyRouter };