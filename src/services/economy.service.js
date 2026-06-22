const { companyRepository } = require('../modules/company/company.repository');
const { articleRepository } = require('../modules/articles/articles.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { totalSalaryExpense } = require('./journalist.service');
const { calculateRevenue, calculateCompanyValue } = require('../utils/gameMath');

async function getEconomy(playerId) {
  const player = await playerRepository.findById(playerId);
  const company = await companyRepository.findByOwnerId(playerId);
  const articles = company ? await articleRepository.listByCompany(company.id) : [];
  const latestArticle = articles[0] || null;
  const salaryExpense = await totalSalaryExpense(playerId);
  const estimatedRevenue = calculateRevenue({
    subscribers: player.subscribers,
    articleQuality: latestArticle ? latestArticle.quality : 0,
    trustScore: player.trustScore
  });

  return {
    money: player.money,
    estimatedRevenue,
    salaryExpense,
    companyValue: player.companyValue
  };
}

async function getStats(playerId) {
  const player = await playerRepository.findById(playerId);
  const company = await companyRepository.findByOwnerId(playerId);

  return {
    money: player.money,
    trustScore: player.trustScore,
    subscribers: player.subscribers,
    companyValue: calculateCompanyValue({
      money: player.money,
      trustScore: player.trustScore,
      subscribers: player.subscribers,
      level: company ? company.level : 1
    }),
    companyLevel: company ? company.level : 0,
    reputation: company ? company.reputation : 0
  };
}

module.exports = { getEconomy, getStats };