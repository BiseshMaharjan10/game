const { AppError } = require('../utils/appError');
const { calculateCompanyValue } = require('../utils/gameMath');
const { companyRepository } = require('../modules/company/company.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { recalculateLeaderboard } = require('./leaderboard.service');
const { debug } = require('../utils/logger');

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

  await playerRepository.update(playerId, { companyValue });
  return { ...player, companyValue };
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

async function upgradeCompany(playerId, coinsOverride) {
  const company = await companyRepository.findByOwnerId(playerId);
  if (!company) {
    throw new AppError('company not found', 404);
  }

  const player = await playerRepository.findById(playerId);
  const upgradeCost = company.level * 500;
  const effectiveMoney = coinsOverride !== undefined ? coinsOverride : player.money;

  debug('[upgrade] level=%d cost=%d effectiveMoney=%s (type=%s) coinsOverride=%s player.money=%d',
    company.level, upgradeCost, effectiveMoney, typeof effectiveMoney, coinsOverride, player.money);

  if (effectiveMoney < upgradeCost) {
    throw new AppError('insufficient funds', 400);
  }

  const updatedCompany = await companyRepository.update(company.id, {
    level: company.level + 1,
    reputation: Math.min(100, company.reputation + 5)
  });

  await playerRepository.update(playerId, {
    money: effectiveMoney - upgradeCost
  });

  await syncPlayerCompanyValue(playerId);
  await recalculateLeaderboard();
  return { company: updatedCompany, cost: upgradeCost };
}

async function syncCompanyState(playerId, payload) {
  const company = await companyRepository.findByOwnerId(playerId);
  if (!company) {
    throw new AppError('company not found', 404);
  }

  const data = {};
  if (payload.unlocked_characters !== undefined) {
    data.unlockedCharacters = payload.unlocked_characters;
  }
  if (payload.desk_assignments !== undefined) {
    data.deskAssignments = payload.desk_assignments;
  }

  if (payload.coins !== undefined) {
    await playerRepository.update(playerId, { money: payload.coins });
  }

  await companyRepository.update(company.id, data);
  const player = await playerRepository.findById(playerId);
  return { player, company };
}

module.exports = {
  getCompany,
  createCompany,
  upgradeCompany,
  syncPlayerCompanyValue,
  syncCompanyState
};
