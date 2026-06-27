const { asyncHandler } = require('../utils/asyncHandler');
const { getLeaderboard } = require('../services/leaderboard.service');
const { getLeaderboardContractPayload } = require('../utils/responseMappers');

const leaderboardHandler = asyncHandler(async (_req, res) => {
  // Real leaderboard entries from DB — no longer discarded
  // Each entry includes { rank, score, player: { money, trustScore, subscribers, companyValue, company } }
  const entries = await getLeaderboard();
  res.json(getLeaderboardContractPayload(entries));
});

module.exports = { leaderboardHandler };
