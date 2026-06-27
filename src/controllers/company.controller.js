const { asyncHandler } = require('../utils/asyncHandler');
const { getCompany, createCompany, upgradeCompany, syncPlayerCompanyValue } = require('../services/company.service');
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

  // Sync company value before responding so coins reflect the latest calculation
  await syncPlayerCompanyValue(req.user.id);
  const playerData = await playerRepository.findById(req.user.id);
  const journalists = company.journalists || [];

  res.json(getCompanyContractPayload(playerData, company, journalists));
});

const createCompanyHandler = asyncHandler(async (req, res) => {
  const company = await createCompany(req.user.id, req.body.name);
  const playerData = await playerRepository.findById(req.user.id);
  res.status(201).json(getCreateCompanyContractPayload(playerData, company));
});

const upgradeCompanyHandler = asyncHandler(async (req, res) => {
  const playerBefore = await playerRepository.findById(req.user.id);
  const company = await upgradeCompany(req.user.id);
  const playerAfter = await playerRepository.findById(req.user.id);
  const costDeducted = Math.max(0, (playerBefore ? playerBefore.money : 0) - (playerAfter ? playerAfter.money : 0));
  res.json(getUpgradeCompanyContractPayload(playerAfter, company, costDeducted));
});

module.exports = { getCompanyHandler, createCompanyHandler, upgradeCompanyHandler };
