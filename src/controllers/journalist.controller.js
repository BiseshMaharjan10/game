const { asyncHandler } = require('../utils/asyncHandler');
const { listJournalists, hireJournalist, fireJournalist } = require('../services/journalist.service');

const listJournalistsHandler = asyncHandler(async (req, res) => {
  const journalists = await listJournalists(req.user.id);
  res.json({ journalists });
});

const hireJournalistHandler = asyncHandler(async (req, res) => {
  const journalist = await hireJournalist(req.user.id, req.body);
  res.status(201).json({ journalist });
});

const fireJournalistHandler = asyncHandler(async (req, res) => {
  const journalist = await fireJournalist(req.user.id, req.body.journalistId);
  res.json({ journalist });
});

module.exports = { listJournalistsHandler, hireJournalistHandler, fireJournalistHandler };
