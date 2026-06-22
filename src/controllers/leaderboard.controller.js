const { asyncHandler } = require('../utils/asyncHandler');
const { getLeaderboard } = require('../services/leaderboard.service');

const leaderboardHandler = asyncHandler(async (_req, res) => {
  const leaderboard = await getLeaderboard();
  res.json({ leaderboard });
});

module.exports = { leaderboardHandler };
