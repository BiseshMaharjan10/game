const { asyncHandler } = require('../utils/asyncHandler');
const { getCompany, createCompany, upgradeCompany, syncPlayerCompanyValue, syncCompanyState } = require('../services/company.service');
const { playerRepository } = require('../modules/auth/auth.repository');
const {
  getCompanyContractPayload,
  getCreateCompanyContractPayload,
  getUpgradeCompanyContractPayload
} = require('../utils/responseMappers');

const getCompanyHandler = asyncHandler(async (req, res) => {
  const company = await getCompany(req.user.id);
  if (!company) {
    return res.status(404).json({ error: { message: 'company not found' } });
  }

  const playerData = await syncPlayerCompanyValue(req.user.id);
  const journalists = company.journalists || [];

  res.json(getCompanyContractPayload(playerData, company, journalists));
});

const createCompanyHandler = asyncHandler(async (req, res) => {
  const company = await createCompany(req.user.id, req.body.name);
  const playerData = await playerRepository.findById(req.user.id);
  res.status(201).json(getCreateCompanyContractPayload(playerData, company));
});

const upgradeCompanyHandler = asyncHandler(async (req, res) => {
  const coinsOverride = req.body.coins;
  const { debug } = require('../utils/logger');
  debug('[upgrade] coinsOverride=%s (type=%s)', coinsOverride, typeof coinsOverride);
  const result = await upgradeCompany(req.user.id, coinsOverride);
  const playerAfter = await playerRepository.findById(req.user.id);
  console.log('[debug upgrade] success level=%d cost=%d money=%d', result.company.level, result.cost, playerAfter.money);
  res.json(getUpgradeCompanyContractPayload(playerAfter, result.company, result.cost));
});

const syncCompanyStateHandler = asyncHandler(async (req, res) => {
  const result = await syncCompanyState(req.user.id, req.body);
  const journalists = result.company ? (result.company.journalists || []) : [];
  res.json(getCompanyContractPayload(result.player, result.company, journalists));
});

module.exports = { getCompanyHandler, createCompanyHandler, upgradeCompanyHandler, syncCompanyStateHandler };
