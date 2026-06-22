const { asyncHandler } = require('../utils/asyncHandler');
const { getEconomy, getStats } = require('../services/economy.service');

const economyHandler = asyncHandler(async (req, res) => {
  const economy = await getEconomy(req.user.id);
  res.json({ economy });
});

const statsHandler = asyncHandler(async (req, res) => {
  const stats = await getStats(req.user.id);
  res.json({ stats });
});

module.exports = { economyHandler, statsHandler };
