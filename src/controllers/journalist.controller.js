const { asyncHandler } = require('../utils/asyncHandler');
const { listJournalists, hireJournalist, fireJournalist } = require('../services/journalist.service');
const { playerRepository } = require('../modules/auth/auth.repository');
const {
  getJournalistListContractPayload,
  getJournalistHireSuccessPayload,
  getJournalistHireFailurePayload
} = require('../utils/responseMappers');

var SKILL_MAP = {
  "Data Entry": 1,
  "Strategic Planning": 2,
  "Market Analysis": 3,
  "Project Management": 4,
};

const listJournalistsHandler = asyncHandler(async (req, res) => {
  // Real journalist rows from the DB — no longer discarded
  const journalists = await listJournalists(req.user.id);
  res.json(getJournalistListContractPayload(journalists));
});

const hireJournalistHandler = asyncHandler(async (req, res) => {
  // Determine salary from request body before the hire attempt so we can
  // report the exact needed/have amounts on failure.
  var salary = req.body.payment === 'diamond' ? 1000 : (req.body.salary || 600);

  var skillVal = SKILL_MAP[req.body.skill];
  if (skillVal === undefined) {
    skillVal = typeof req.body.skill === 'number' ? req.body.skill : 1;
  }

  var payload = {
    name:   req.body.character || req.body.name,
    skill:  skillVal,
    salary: salary
  };

  try {
    // journalist = newly created Prisma row
    const journalist = await hireJournalist(req.user.id, payload);

    // Fetch updated player (money already deducted by service) and full journalist list
    const playerAfter  = await playerRepository.findById(req.user.id);
    const allJournalists = await listJournalists(req.user.id);

    res.status(201).json(
      getJournalistHireSuccessPayload(journalist, playerAfter, allJournalists, req.body)
    );
  } catch (error) {
    if (error.message === 'insufficient funds') {
      // Fetch player to report real "have" amount
      const player = await playerRepository.findById(req.user.id);
      const have = player ? player.money : null;
      res.status(400).json(
        getJournalistHireFailurePayload(req.body, salary, have)
      );
      return;
    }
    throw error;
  }
});

const fireJournalistHandler = asyncHandler(async (req, res) => {
  const journalist = await fireJournalist(req.user.id, req.body.journalistId);
  res.json({ journalist });
});

module.exports = { listJournalistsHandler, hireJournalistHandler, fireJournalistHandler };
