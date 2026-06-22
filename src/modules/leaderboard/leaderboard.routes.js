const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { leaderboardHandler } = require('../../controllers/leaderboard.controller');

const leaderboardRouter = Router();

leaderboardRouter.get('/', authRequired, leaderboardHandler);

module.exports = { leaderboardRouter };