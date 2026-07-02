const { AppError } = require('../utils/appError');
const { calculateCompanyValue } = require('../utils/gameMath');
const { companyRepository } = require('../modules/company/company.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { deskRepository } = require('../modules/desks/desks.repository');
const { recalculateLeaderboard } = require('./leaderboard.service');
const { debug } = require('../utils/logger');

async function ensureCompany(playerId) {
  const existing = await companyRepository.findByOwnerId(playerId);
  if (existing) return existing;

  console.log(`[ensureCompany] creating missing company for player ${playerId}`);
  const player = await playerRepository.findById(playerId);
  return companyRepository.create({
    ownerId: playerId,
    name: (player && player.companyName) || "",
    level: 1,
    reputation: 50,
  });
}

async function getCompany(playerId) {
  return ensureCompany(playerId);
}

async function syncPlayerCompanyValue(playerId) {
  const player = await playerRepository.findById(playerId);
  if (!player) {
    return null;
  }

  const company = await companyRepository.findByOwnerId(playerId);
  const companyValue = calculateCompanyValue({
    money: player.coins,
    trustScore: player.trustScore,
    subscribers: player.gems,
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
  const company = await ensureCompany(playerId);

  const player = await playerRepository.findById(playerId);
  const allDesks = await deskRepository.findByPlayerId(playerId);
  const nextLocked = allDesks.find(function(d) { return !d.unlocked; });
  const upgradeCost = nextLocked ? nextLocked.cost : 500;
  const effectiveMoney = coinsOverride !== undefined ? coinsOverride : player.coins;

  console.log('[upgrade] level=%d cost=%d effectiveMoney=%s coinsOverride=%s player.coins=%d',
    company.level, upgradeCost, effectiveMoney, coinsOverride, player.coins);

  if (effectiveMoney < upgradeCost) {
    throw new AppError('insufficient funds', 400);
  }

  const updatedCompany = await companyRepository.update(company.id, {
    level: company.level + 1,
    reputation: Math.min(100, company.reputation + 5)
  });

  await playerRepository.update(playerId, {
    coins: effectiveMoney - upgradeCost
  });

  if (nextLocked) {
    await deskRepository.upsert(playerId, nextLocked.deskIndex, { unlocked: true });
    console.log(`[upgrade] unlocked desk deskIndex=${nextLocked.deskIndex}`);
  }

  await syncPlayerCompanyValue(playerId);
  await recalculateLeaderboard();
  return { company: updatedCompany, cost: upgradeCost };
}

async function syncCompanyState(playerId, payload) {
  const company = await ensureCompany(playerId);

  const data = {};
  if (payload.unlocked_characters !== undefined) {
    data.unlockedCharacters = payload.unlocked_characters;
  }
  if (payload.desk_assignments !== undefined) {
    data.deskAssignments = payload.desk_assignments;
  }

  if (payload.coins !== undefined) {
    await playerRepository.update(playerId, { coins: payload.coins });
  }

  await companyRepository.update(company.id, data);
  const player = await playerRepository.findById(playerId);
  return { player, company };
}

module.exports = {
  ensureCompany,
  getCompany,
  createCompany,
  upgradeCompany,
  syncPlayerCompanyValue,
  syncCompanyState
};
