const { asyncHandler } = require('../utils/asyncHandler');
const investigationService = require('../services/investigation.service');

const startInvestigationHandler = asyncHandler(async (req, res) => {
  const { scenarioId, journalistId } = req.body;
  if (!scenarioId || !journalistId) {
    return res.status(400).json({ error: 'scenarioId and journalistId are required' });
  }

  const result = await investigationService.startInvestigation(
    req.user.id, scenarioId, journalistId
  );

  res.status(201).json(result);
});

const getCurrentInvestigationsHandler = asyncHandler(async (req, res) => {
  const investigations = investigationService.getCurrentInvestigations(req.user.id);
  res.json({ investigations });
});

const getCompletedInvestigationsHandler = asyncHandler(async (req, res) => {
  const results = investigationService.getCompletedInvestigations(req.user.id);
  res.json({ results });
});

module.exports = {
  startInvestigationHandler,
  getCurrentInvestigationsHandler,
  getCompletedInvestigationsHandler,
};
