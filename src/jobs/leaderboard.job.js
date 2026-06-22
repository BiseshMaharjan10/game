const { rebuildLeaderboard } = require('../services/leaderboard.service');

function startLeaderboardJob() {
  const interval = setInterval(() => {
    rebuildLeaderboard().catch(() => {});
  }, 60 * 1000);

  return () => clearInterval(interval);
}

module.exports = { startLeaderboardJob };
