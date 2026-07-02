const { calculateLeaderboardScore } = require('../utils/gameMath');
const { leaderboardRepository } = require('../modules/leaderboard/leaderboard.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { domainEvents } = require('../events');

async function rebuildLeaderboard() {
  const players = await playerRepository.list();
  const ranked = players
    .map((player) => ({
      playerId: player.id,
      score: calculateLeaderboardScore({
        companyValue: player.companyValue,
        trustScore: player.trustScore,
        subscribers: player.gems
      })
    }))
    .sort((left, right) => right.score - left.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const leaderboard = [];
  for (const entry of ranked) {
    leaderboard.push(await leaderboardRepository.upsert(entry));
  }

  domainEvents.emit('leaderboard.updated', leaderboard);
  return leaderboardRepository.list();
}

async function getLeaderboard() {
  return leaderboardRepository.list();
}

module.exports = {
  rebuildLeaderboard,
  recalculateLeaderboard: rebuildLeaderboard,  // alias used by all other services
  getLeaderboard
};
