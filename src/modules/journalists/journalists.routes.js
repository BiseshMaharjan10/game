const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { requireFields } = require('../../middleware/validate');
const { listJournalistsHandler, hireJournalistHandler, fireJournalistHandler } = require('../../controllers/journalist.controller');

const journalistRouter = Router();

journalistRouter.get('/', authRequired, listJournalistsHandler);
journalistRouter.post('/hire', authRequired, requireFields(['name', 'skill']), hireJournalistHandler);
journalistRouter.post('/fire', authRequired, requireFields(['journalistId']), fireJournalistHandler);

module.exports = { journalistRouter };