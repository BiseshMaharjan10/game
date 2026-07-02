const { asyncHandler } = require("../utils/asyncHandler");
const { getLeaderboard } = require("../services/leaderboard.service");

const leaderboardHandler = asyncHandler(async (_req, res) => {
  // Real leaderboard entries from DB — no longer discarded
  // Each entry includes { rank, score, player: { money, trustScore, subscribers, companyValue, company } }
  const entries = await getLeaderboard();
  res.json({
    outlets: entries.map((entry) => {
      const player = entry.player || {};
      const company = player.company || null;
      const outletName =
        company && company.name
          ? company.name
          : player.companyName ||
            (player.email ? player.email.split("@")[0] : null);

      return {
        rank: entry.rank,
        name: outletName,
        trust_score: player.trustScore != null ? player.trustScore : null,
        coin: player.coins != null ? player.coins : null,
        subscribers: player.gems != null ? player.gems : null,
        score: entry.score,
      };
    }),
  });
});

module.exports = { leaderboardHandler };
