const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { statsHandler } = require('../../controllers/economy.controller');

const statsRouter = Router();

statsRouter.get('/', authRequired, statsHandler);

module.exports = { statsRouter };
