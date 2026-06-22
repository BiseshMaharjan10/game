const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { economyHandler, statsHandler } = require('../../controllers/economy.controller');

const economyRouter = Router();

economyRouter.get('/', authRequired, economyHandler);
economyRouter.get('/stats', authRequired, statsHandler);

module.exports = { economyRouter };