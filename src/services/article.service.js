const { AppError } = require('../utils/appError');
const { calculateRevenue, calculateTrustDelta, calculateSubscriberDelta, calculateCompanyValue } = require('../utils/gameMath');
const { companyRepository } = require('../modules/company/company.repository');
const { articleRepository } = require('../modules/articles/articles.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { totalSalaryExpense } = require('./journalist.service');
const { recalculateLeaderboard } = require('./leaderboard.service');
const { emitEvent } = require('../sockets/hub');

async function publishArticle(playerId, { title, type, quality, verifiedInfo = false, isFakeNews = false }) {
  const company = await companyRepository.findByOwnerId(playerId);
  if (!company) {
    throw new AppError('company not found', 404);
  }

  const player = await playerRepository.findById(playerId);
  const trustDelta = calculateTrustDelta({ quality, verifiedInfo, isFakeNews });
  const subscriberDelta = calculateSubscriberDelta({ trustDelta, quality });
  const nextTrustScore = Math.max(0, Math.min(100, player.trustScore + trustDelta));
  const nextSubscribers = Math.max(0, player.subscribers + subscriberDelta);
  const revenue = calculateRevenue({
    subscribers: nextSubscribers,
    articleQuality: quality,
    trustScore: nextTrustScore
  });
  const salaryExpense = await totalSalaryExpense(playerId);
  const nextMoney = Math.max(0, player.money + revenue - salaryExpense);
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
    money: nextMoney,
    trustScore: nextTrustScore,
    subscribers: nextSubscribers,
    companyValue: nextCompanyValue
  });

  await recalculateLeaderboard();
  emitEvent('money_updated', { playerId, money: nextMoney });
  emitEvent('trust_updated', { playerId, trustScore: nextTrustScore });
  emitEvent('subscriber_updated', { playerId, subscribers: nextSubscribers });

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
  const company = await companyRepository.findByOwnerId(playerId);
  if (!company) {
    throw new AppError('company not found', 404);
  }

  return articleRepository.listByCompany(company.id);
}

module.exports = { publishArticle, articleHistory };
