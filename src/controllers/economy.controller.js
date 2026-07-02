const { asyncHandler } = require("../utils/asyncHandler");
const { getEconomy, getStats } = require("../services/economy.service");
const { getCharacterCount } = require("../services/journalist.service");
const { getCompany } = require("../services/company.service");

const economyHandler = asyncHandler(async (req, res) => {
  // economyData = { money, estimatedRevenue, salaryExpense, companyValue }
  const economyData = await getEconomy(req.user.id);

  res.json({
    coin: economyData.money,
    salary_expense: economyData.salaryExpense,
    company_value: economyData.companyValue,
  });
});

const economyStatsHandler = asyncHandler(async (req, res) => {
  // stats = { money, trustScore, subscribers, companyValue, companyLevel, reputation }
  const stats = await getStats(req.user.id);

  // Fetch character count for the stats display
  const characterCount = await getCharacterCount(req.user.id);

  res.json({
    coin: stats.money,
    trust_score: stats.trustScore,
    gems: stats.subscribers,
    company_value: stats.companyValue,
    company_level: stats.companyLevel,
    reputation: stats.reputation,
    journalist_count: characterCount,
  });
});

const playerStatsHandler = asyncHandler(async (req, res) => {
  // stats = { money, trustScore, subscribers, companyValue, companyLevel, reputation }
  const stats = await getStats(req.user.id);

  // Fetch company for outlet name and character count
  const company = await getCompany(req.user.id);
  const characterCount = await getCharacterCount(req.user.id);

  res.json({
    match_active: true,
    outlet: company ? company.name : null,
    turn: 0,
    max_turns: 40,
    trust: stats.trustScore,
    coin: stats.money,
    gems: stats.subscribers,
    company_value: stats.companyValue,
    company_level: stats.companyLevel,
    reputation: stats.reputation,
    journalists: characterCount,
  });
});

module.exports = { economyHandler, economyStatsHandler, playerStatsHandler };
