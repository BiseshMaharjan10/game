const { AppError } = require('../utils/appError');
const { calculateCompanyValue } = require('../utils/gameMath');
const { companyRepository } = require('../modules/company/company.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { recalculateLeaderboard } = require('./leaderboard.service');

async function getCompany(playerId) {
  return companyRepository.findByOwnerId(playerId);
}

async function syncPlayerCompanyValue(playerId) {
  const player = await playerRepository.findById(playerId);
  if (!player) {
    return null;
  }

  const company = await companyRepository.findByOwnerId(playerId);
  const companyValue = calculateCompanyValue({
    money: player.money,
    trustScore: player.trustScore,
    subscribers: player.subscribers,
    level: company ? company.level : 1
  });

  return playerRepository.update(playerId, { companyValue });
}

async function createCompany(playerId, name) {
  const existing = await companyRepository.findByOwnerId(playerId);
  if (existing) {
    throw new AppError('company already exists', 409);
  }

  const company = await companyRepository.create({
    ownerId: playerId,
    name,
    level: 1,
    reputation: 50
  });

  await syncPlayerCompanyValue(playerId);
  await recalculateLeaderboard();
  return company;
}

async function upgradeCompany(playerId) {
  const company = await companyRepository.findByOwnerId(playerId);
  if (!company) {
    throw new AppError('company not found', 404);
  }

  const player = await playerRepository.findById(playerId);
  const upgradeCost = company.level * 500;

  if (player.money < upgradeCost) {
    throw new AppError('insufficient funds', 400);
  }

  const updatedCompany = await companyRepository.update(company.id, {
    level: company.level + 1,
    reputation: Math.min(100, company.reputation + 5)
  });

  await playerRepository.update(playerId, {
    money: player.money - upgradeCost
  });

  await syncPlayerCompanyValue(playerId);
  await recalculateLeaderboard();
  return updatedCompany;
}

module.exports = {
  getCompany,
  createCompany,
  upgradeCompany,
  syncPlayerCompanyValue
};
