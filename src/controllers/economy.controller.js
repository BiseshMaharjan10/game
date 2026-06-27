const { asyncHandler } = require('../utils/asyncHandler');
const { getEconomy, getStats } = require('../services/economy.service');
const { listJournalists } = require('../services/journalist.service');
const { getCompany } = require('../services/company.service');
const {
  getEconomyContractPayload,
  getStatsContractPayload,
  getFullStatsContractPayload
} = require('../utils/responseMappers');

const economyHandler = asyncHandler(async (req, res) => {
  // economyData = { money, estimatedRevenue, salaryExpense, companyValue }
  const economyData = await getEconomy(req.user.id);

  // No longer discarded — passed directly to mapper
  res.json(getEconomyContractPayload(economyData));
});

const economyStatsHandler = asyncHandler(async (req, res) => {
  // stats = { money, trustScore, subscribers, companyValue, companyLevel, reputation }
  const stats = await getStats(req.user.id);

  // Fetch journalist count for the stats display
  const journalists = await listJournalists(req.user.id);
  const journalistCount = journalists.length;

  res.json(getStatsContractPayload(stats, journalistCount));
});

const playerStatsHandler = asyncHandler(async (req, res) => {
  // stats = { money, trustScore, subscribers, companyValue, companyLevel, reputation }
  const stats = await getStats(req.user.id);

  // Fetch company for outlet name and journalist count
  const company = await getCompany(req.user.id);
  const journalists = await listJournalists(req.user.id);
  const journalistCount = journalists.length;

  res.json(getFullStatsContractPayload(stats, company, journalistCount));
});

module.exports = { economyHandler, economyStatsHandler, playerStatsHandler };
