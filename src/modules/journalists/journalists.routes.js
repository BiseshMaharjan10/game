const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { requireFields } = require('../../middleware/validate');
const { listJournalistsHandler, hireJournalistHandler, fireJournalistHandler } = require('../../controllers/journalist.controller');

const journalistRouter = Router();

journalistRouter.get('/', authRequired, listJournalistsHandler);
journalistRouter.post('/hire', authRequired, (req, _res, next) => {
  if (!req.body?.character && !req.body?.name) {
    return _res.status(400).json({ error: 'Missing fields: character' });
  }
  next();
}, hireJournalistHandler);
journalistRouter.post('/fire', authRequired, requireFields(['journalistId']), fireJournalistHandler);

module.exports = { journalistRouter };