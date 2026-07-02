const { AppError } = require('../utils/appError');
const { calculateRevenue, calculateTrustDelta, calculateSubscriberDelta, calculateCompanyValue } = require('../utils/gameMath');
const { companyRepository } = require('../modules/company/company.repository');
const { ensureCompany } = require('./company.service');
const { articleRepository } = require('../modules/articles/articles.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { totalSalaryExpense } = require('./journalist.service');
const { recalculateLeaderboard } = require('./leaderboard.service');
const { emitEvent } = require('../sockets/hub');

async function publishArticle(playerId, { title, type, quality, verifiedInfo = false, isFakeNews = false }) {
  const company = await ensureCompany(playerId);

  const player = await playerRepository.findById(playerId);
  const trustDelta = calculateTrustDelta({ quality, verifiedInfo, isFakeNews });
  const subscriberDelta = calculateSubscriberDelta({ trustDelta, quality });
  const nextTrustScore = Math.max(0, Math.min(100, player.trustScore + trustDelta));
  const nextSubscribers = Math.max(0, player.gems + subscriberDelta);
  const revenue = calculateRevenue({
    subscribers: nextSubscribers,
    articleQuality: quality,
    trustScore: nextTrustScore
  });
  const salaryExpense = await totalSalaryExpense(playerId);
  const nextMoney = Math.max(0, player.coins + revenue - salaryExpense);
  const nextCompanyValue = calculateCompanyValue({
    money: nextMoney,
    trustScore: nextTrustScore,
    subscribers: nextSubscribers,
    level: company.level
  });

  const article = await articleRepository.create({
    companyId: company.id,
    title,
    type,
    quality,
    verifiedInfo,
    isFakeNews
  });

  await playerRepository.update(playerId, {
    coins: nextMoney,
    trustScore: nextTrustScore,
    gems: nextSubscribers,
    companyValue: nextCompanyValue
  });

  await recalculateLeaderboard();
  emitEvent('coins_updated', { playerId, coins: nextMoney });
  emitEvent('trust_updated', { playerId, trustScore: nextTrustScore });
  emitEvent('gems_updated', { playerId, gems: nextSubscribers });

  return {
    article,
    effects: {
      revenue,
      salaryExpense,
      trustDelta,
      subscriberDelta,
      nextMoney,
      nextTrustScore,
      nextSubscribers,
      nextCompanyValue
    }
  };
}

async function articleHistory(playerId) {
  const company = await ensureCompany(playerId);

  return articleRepository.listByCompany(company.id);
}

module.exports = { publishArticle, articleHistory };
