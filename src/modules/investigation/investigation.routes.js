const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const {
  startInvestigationHandler,
  getCurrentInvestigationsHandler,
  getCompletedInvestigationsHandler,
} = require('../../controllers/investigation.controller');

const investigationRouter = Router();

investigationRouter.post('/start', authRequired, startInvestigationHandler);
investigationRouter.get('/current', authRequired, getCurrentInvestigationsHandler);
investigationRouter.get('/results', authRequired, getCompletedInvestigationsHandler);

module.exports = { investigationRouter };
