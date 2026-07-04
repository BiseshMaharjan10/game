const { calculateLeaderboardScore } = require('../utils/gameMath');
const { leaderboardRepository } = require('../modules/leaderboard/leaderboard.repository');
const { judgementRepository } = require('../modules/judgement/judgement.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { domainEvents } = require('../events');
const { log } = require('../utils/logger');

async function rebuildLeaderboard() {
  const players = await playerRepository.list();

  const judgementsByPlayer = new Map();
  const allJudgements = await judgementRepository.findAll();
  for (const j of allJudgements) {
    if (!judgementsByPlayer.has(j.playerId)) {
      judgementsByPlayer.set(j.playerId, []);
    }
    judgementsByPlayer.get(j.playerId).push(j);
  }

  const ranked = [];
  for (const player of players) {
    const playerJudgements = judgementsByPlayer.get(player.id) || [];
    const totalJudgementScore = playerJudgements.reduce((sum, j) => sum + j.backendScore, 0);
    const articleCount = playerJudgements.length;

    const baseScore = calculateLeaderboardScore({
      companyValue: player.companyValue,
      trustScore: player.trustScore,
      subscribers: player.gems
    });

    const score = baseScore + totalJudgementScore;

    ranked.push({
      playerId: player.id,
      score,
      articleCount,
      totalJudgementScore,
    });
  }

  ranked.sort((left, right) => right.score - left.score);
  ranked.forEach((entry, index) => { entry.rank = index + 1; });

  const leaderboard = [];
  for (const entry of ranked) {
    leaderboard.push(await leaderboardRepository.upsert({
      playerId: entry.playerId,
      rank: entry.rank,
      score: entry.score,
    }));
  }

  log('INFO', '[LEADERBOARD] Rebuilt', { playerCount: ranked.length });

  domainEvents.emit('leaderboard.updated', leaderboard);
  return leaderboardRepository.list();
}

async function getLeaderboard() {
  return leaderboardRepository.list();
}

async function getRoomLeaderboard(roomId) {
  const judgements = await judgementRepository.findByRoomId(roomId);

  const playerScores = new Map();
  for (const j of judgements) {
    if (!playerScores.has(j.playerId)) {
      playerScores.set(j.playerId, {
        playerId: j.playerId,
        totalScore: 0,
        articleCount: 0,
        verdicts: [],
      });
    }
    const entry = playerScores.get(j.playerId);
    entry.totalScore += j.backendScore;
    entry.articleCount += 1;
    entry.verdicts.push(j.finalVerdict);
  }

  const entries = Array.from(playerScores.values())
    .map(entry => ({
      ...entry,
      averageScore: entry.articleCount > 0 ? Math.round(entry.totalScore / entry.articleCount) : 0,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return entries;
}

module.exports = {
  rebuildLeaderboard,
  recalculateLeaderboard: rebuildLeaderboard,
  getLeaderboard,
  getRoomLeaderboard,
};
