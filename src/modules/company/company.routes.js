const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { requireFields } = require('../../middleware/validate');
const { getCompanyHandler, createCompanyHandler, upgradeCompanyHandler } = require('../../controllers/company.controller');

const companyRouter = Router();

companyRouter.get('/', authRequired, getCompanyHandler);
companyRouter.post('/create', authRequired, requireFields(['name']), createCompanyHandler);
companyRouter.post('/upgrade', authRequired, upgradeCompanyHandler);

module.exports = { companyRouter };