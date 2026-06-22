const { AppError } = require('../utils/appError');
const { calculateCompanyValue } = require('../utils/gameMath');
const { companyRepository } = require('../modules/company/company.repository');
const { journalistRepository } = require('../modules/journalists/journalists.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { recalculateLeaderboard } = require('./leaderboard.service');

async function listJournalists(playerId) {
  const company = await companyRepository.findByOwnerId(playerId);
  if (!company) {
    return [];
  }

  return journalistRepository.listByCompany(company.id);
}

async function hireJournalist(playerId, { name, skill, salary }) {
  const company = await companyRepository.findByOwnerId(playerId);
  if (!company) {
    throw new AppError('company not found', 404);
  }

  const player = await playerRepository.findById(playerId);
  if (player.money < salary) {
    throw new AppError('insufficient funds', 400);
  }

  const journalist = await journalistRepository.create({
    companyId: company.id,
    name,
    skill,
    salary,
    loyalty: 50
  });

  await playerRepository.update(playerId, {
    money: player.money - salary,
    companyValue: calculateCompanyValue({
      money: player.money - salary,
      trustScore: player.trustScore,
      subscribers: player.subscribers,
      level: company.level
    })
  });

  await recalculateLeaderboard();
  return journalist;
}

async function fireJournalist(playerId, journalistId) {
  const company = await companyRepository.findByOwnerId(playerId);
  if (!company) {
    throw new AppError('company not found', 404);
  }

  const journalist = await journalistRepository.findById(journalistId);
  if (!journalist || journalist.companyId !== company.id) {
    throw new AppError('journalist not found', 404);
  }

  return journalistRepository.delete(journalistId);
}

async function totalSalaryExpense(playerId) {
  const company = await companyRepository.findByOwnerId(playerId);
  if (!company) {
    return 0;
  }

  const aggregated = await journalistRepository.sumSalary(company.id);
  return aggregated._sum.salary || 0;
}

module.exports = {
  listJournalists,
  hireJournalist,
  fireJournalist,
  totalSalaryExpense
};
