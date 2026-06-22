const { asyncHandler } = require('../utils/asyncHandler');
const { getCompany, createCompany, upgradeCompany } = require('../services/company.service');

const getCompanyHandler = asyncHandler(async (req, res) => {
  const company = await getCompany(req.user.id);
  res.json({ company });
});

const createCompanyHandler = asyncHandler(async (req, res) => {
  const company = await createCompany(req.user.id, req.body.name);
  res.status(201).json({ company });
});

const upgradeCompanyHandler = asyncHandler(async (req, res) => {
  const company = await upgradeCompany(req.user.id);
  res.json({ company });
});

module.exports = { getCompanyHandler, createCompanyHandler, upgradeCompanyHandler };
