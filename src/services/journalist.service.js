const { AppError } = require('../utils/appError');
const { calculateCompanyValue } = require('../utils/gameMath');
const { prisma } = require('../config/prisma');
const { characterRepository } = require('../modules/journalists/journalists.repository');
const { deskRepository } = require('../modules/desks/desks.repository');
const { recalculateLeaderboard } = require('./leaderboard.service');

const OWNERSHIP_LIMITS = {
  bob: Infinity,
  robin: 1,
  lisa: 1,
  michael: 1,
};

async function getCharacterTemplate(characterId) {
  const tmpl = await prisma.characterTemplate.findUnique({ where: { id: characterId } });
  if (!tmpl) throw new AppError('character not found', 404);
  return tmpl;
}

async function listCharacterTemplates() {
  return prisma.characterTemplate.findMany();
}

async function isValidCharacterId(id) {
  const tmpl = await prisma.characterTemplate.findUnique({ where: { id } });
  return !!tmpl;
}

async function listOwned(playerId) {
  return characterRepository.listByPlayer(playerId);
}

async function hireCharacter(playerId, characterId, purchaseType, deskIndex) {
  const tag = '[hireCharacter]';
  const _t0 = Date.now();
  console.log(`${tag} START playerId=${playerId} characterId=${characterId} purchaseType=${purchaseType} deskIndex=${deskIndex}`);

  try {
    characterId = characterId.toLowerCase();
    console.log(`${tag} toLowerCase -> ${characterId}`);

    const template = await getCharacterTemplate(characterId);
    console.log(`${tag} template found: id=${template.id}`);

    if (deskIndex == null || deskIndex < 1 || deskIndex > 8) {
      console.log(`${tag} FAIL: invalid deskIndex=${deskIndex}`);
      throw new AppError('desk index must be between 1 and 8', 400);
    }

    const limit = OWNERSHIP_LIMITS[characterId];
    const isCoins = purchaseType === 'coins';
    const cost = isCoins ? template.recruitCoins : template.recruitGems;
    const currencyField = isCoins ? 'coins' : 'gems';
    const insufficientError = isCoins ? 'insufficient coins' : 'insufficient gems';

    console.log(`${tag} cost=${cost} limit=${limit} currencyField=${currencyField} purchaseType=${purchaseType}`);

    let result;
    let _t_pre_tx = Date.now();

    await prisma.$transaction(async function (tx) {
      const _t_tx0 = Date.now();
      console.log(`${tag} TX: START`);

      const desk = await tx.desk.findUnique({
        where: { playerId_deskIndex: { playerId, deskIndex } },
      });
      const _t_desk = Date.now();
      console.log(`${tag} TX: Desk found=${!!desk} unlocked=${desk ? desk.unlocked : '?'} assignedCharacterId=${desk ? desk.assignedCharacterId : '?'}`);

      if (!desk) {
        console.log(`${tag} TX: FAIL desk not found`);
        throw new AppError('desk not found', 404);
      }

      if (!desk.unlocked) {
        console.log(`${tag} TX: FAIL desk locked`);
        throw new AppError('desk is locked', 400);
      }

      if (desk.assignedCharacterId) {
        console.log(`${tag} TX: FAIL desk occupied`);
        throw new AppError('desk already occupied', 409);
      }

      console.log(`${tag} TX: findUnique PlayerCharacter playerId=${playerId} characterId=${characterId}`);
      const existing = await tx.playerCharacter.findUnique({
        where: { playerId_characterId: { playerId, characterId } },
      });
      const _t_pc = Date.now();
      console.log(`${tag} TX: PlayerCharacter found=${!!existing} quantity=${existing ? existing.quantity : 0}`);

      if (existing && existing.quantity >= limit) {
        console.log(`${tag} TX: FAIL limit reached qty=${existing.quantity} limit=${limit}`);
        throw new AppError('character already recruited', 409);
      }

      console.log(`${tag} TX: findUnique Player id=${playerId}`);
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: { company: true },
      });
      const _t_player = Date.now();
      console.log(`${tag} TX: Player found=${!!player} coins=${player ? player.coins : '?'} gems=${player ? player.gems : '?'}`);

      if (!player) {
        console.log(`${tag} TX: FAIL player not found`);
        throw new AppError('player not found', 404);
      }

      const balance = player[currencyField];
      console.log(`${tag} TX: balance.${currencyField}=${balance} cost=${cost}`);

      if (balance < cost) {
        console.log(`${tag} TX: FAIL insufficient ${currencyField} balance=${balance} cost=${cost}`);
        throw new AppError(insufficientError, 400);
      }

      const newCurrencyValue = player[currencyField] - cost;
      const newQuantity = existing ? existing.quantity + 1 : 1;
      const companyLevel = player.company ? player.company.level : 1;

      console.log(`${tag} TX: BEFORE coins=${player.coins} gems=${player.gems}`);
      console.log(`${tag} TX: deduct ${cost} from ${currencyField} -> new${currencyField}=${newCurrencyValue} newQuantity=${newQuantity}`);
      console.log(`${tag} TX: AFTER would be coins=${isCoins ? newCurrencyValue : player.coins} gems=${isCoins ? player.gems : newCurrencyValue}`);

      console.log(`${tag} TX: upsert PlayerCharacter`);
      await tx.playerCharacter.upsert({
        where: { playerId_characterId: { playerId, characterId } },
        create: { playerId, characterId, quantity: newQuantity },
        update: { quantity: newQuantity },
      });
      const _t_upsert = Date.now();
      console.log(`${tag} TX: PlayerCharacter upserted`);

      console.log(`${tag} TX: assign character to desk ${deskIndex}`);
      await tx.desk.update({
        where: { playerId_deskIndex: { playerId, deskIndex } },
        data: { assignedCharacterId: characterId },
      });
      const _t_desk_upd = Date.now();
      console.log(`${tag} TX: Desk assigned`);

      const newCompanyValue = calculateCompanyValue({
        money: purchaseType === 'coins' ? newCurrencyValue : player.coins,
        trustScore: player.trustScore,
        subscribers: purchaseType === 'gems' ? newCurrencyValue : player.gems,
        level: companyLevel,
      });

      const updateData = { companyValue: newCompanyValue };
      updateData[currencyField] = newCurrencyValue;

      console.log(`${tag} TX: update Player id=${playerId}`, updateData);
      await tx.player.update({
        where: { id: playerId },
        data: updateData,
      });
      const _t_player_upd = Date.now();
      console.log(`${tag} TX: Player updated`);

      console.log(`${tag} TX: COMMIT`);

      console.log(`[TIMING]   Load Desk: ${_t_desk - _t_tx0} ms`);
      console.log(`[TIMING]   Load PlayerCharacter: ${_t_pc - _t_desk} ms`);
      console.log(`[TIMING]   Load Player: ${_t_player - _t_pc} ms`);
      console.log(`[TIMING]   Upsert PlayerCharacter: ${_t_upsert - _t_player} ms`);
      console.log(`[TIMING]   Update Desk: ${_t_desk_upd - _t_upsert} ms`);
      console.log(`[TIMING]   Update Player: ${_t_player_upd - _t_desk_upd} ms`);
      console.log(`[TIMING]   Transaction total: ${Date.now() - _t_tx0} ms`);
    });

    const _t_post_tx = Date.now();
    console.log(`[TIMING] Pre-transaction overhead: ${_t_pre_tx - _t0} ms`);
    console.log(`[TIMING] Transaction (Prisma): ${_t_post_tx - _t_pre_tx} ms`);

    console.log(`${tag} TX committed, recalculating leaderboard outside transaction`);
    await recalculateLeaderboard();
    const _t_leaderboard = Date.now();

    console.log(`${tag} findUnique Player (final) id=${playerId}`);
    result = await prisma.player.findUnique({
      where: { id: playerId },
      include: { company: true, characters: true, desks: { orderBy: { deskIndex: 'asc' } } },
    });
    const _t_final = Date.now();
    const charIds = result.characters.map(function (c) { return c.characterId + 'x' + c.quantity; });
    console.log(`${tag} FINAL coins=${result.coins} gems=${result.gems} characters=[${charIds.join(', ')}]`);

    console.log(`[TIMING] Leaderboard recalculation: ${_t_leaderboard - _t_post_tx} ms`);
    console.log(`[TIMING] Final player query: ${_t_final - _t_leaderboard} ms`);
    const totalService = Date.now() - _t0;
    console.log(`[TIMING] hireCharacter TOTAL: ${totalService} ms`);

    console.log(`${tag} SUCCESS`);
    return result;
  } catch (err) {
    console.error(`${tag} EXCEPTION:`, err);
    throw err;
  }
}

async function appointCharacter(playerId, characterId) {
  const tag = '[appointCharacter]';
  console.log(`${tag} START playerId=${playerId} characterId=${characterId}`);

  try {
    characterId = characterId.toLowerCase();
    console.log(`${tag} toLowerCase -> ${characterId}`);

    const template = await getCharacterTemplate(characterId);
    const costCoins = template.recurringCost;
    console.log(`${tag} costCoins=${costCoins}`);

    let result;

    await prisma.$transaction(async function (tx) {
      console.log(`${tag} TX: START`);

      console.log(`${tag} TX: findUnique PlayerCharacter`);
      const existing = await tx.playerCharacter.findUnique({
        where: { playerId_characterId: { playerId, characterId } },
      });
      console.log(`${tag} TX: existing=${!!existing} quantity=${existing ? existing.quantity : 0}`);

      if (!existing || existing.quantity < 1) {
        console.log(`${tag} TX: FAIL character not owned`);
        throw new AppError('character not owned', 400);
      }

      console.log(`${tag} TX: findUnique Player`);
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: { company: true },
      });
      console.log(`${tag} TX: Player coins=${player ? player.coins : '?'} gems=${player ? player.gems : '?'}`);

      if (!player) {
        console.log(`${tag} TX: FAIL player not found`);
        throw new AppError('player not found', 404);
      }

      console.log(`${tag} TX: balance.coins=${player.coins} cost=${costCoins}`);
      if (player.coins < costCoins) {
        console.log(`${tag} TX: FAIL insufficient coins`);
        throw new AppError('insufficient coins', 400);
      }

      const newCoins = player.coins - costCoins;
      const newCompanyValue = calculateCompanyValue({
        money: newCoins,
        trustScore: player.trustScore,
        subscribers: player.gems,
        level: player.company ? player.company.level : 1,
      });

      console.log(`${tag} TX: update Player coins=${newCoins} companyValue=${newCompanyValue}`);
      await tx.player.update({
        where: { id: playerId },
        data: {
          coins: newCoins,
          companyValue: newCompanyValue,
        },
      });
      console.log(`${tag} TX: Player updated`);

      console.log(`${tag} TX: COMMIT`);
    });

    console.log(`${tag} TX committed, recalculating leaderboard outside transaction`);
    await recalculateLeaderboard();

    console.log(`${tag} findUnique Player (final)`);
    result = await prisma.player.findUnique({
      where: { id: playerId },
      include: { company: true, characters: true },
    });
    console.log(`${tag} Final player coins=${result.coins} gems=${result.gems} characters=${result.characters.length}`);

    console.log(`${tag} SUCCESS`);
    return result;
  } catch (err) {
    console.error(`${tag} EXCEPTION:`, err);
    throw err;
  }
}

async function totalSalaryExpense(playerId) {
  const characters = await characterRepository.listByPlayer(playerId);
  const templates = await prisma.characterTemplate.findMany();
  const costMap = {};
  for (const t of templates) {
    costMap[t.id] = t.recurringCost;
  }
  return characters.reduce(function (sum, pc) {
    const cost = costMap[pc.characterId] || 0;
    return sum + (pc.quantity > 0 ? pc.quantity * cost : 0);
  }, 0);
}

async function getCharacterCount(playerId) {
  const characters = await characterRepository.listByPlayer(playerId);
  return characters.reduce(function (sum, pc) {
    return sum + pc.quantity;
  }, 0);
}

async function getUnlockedCharacterIds(playerId) {
  const characters = await characterRepository.listByPlayer(playerId);
  const ids = [];
  for (const pc of characters) {
    for (let i = 0; i < pc.quantity; i++) {
      ids.push(pc.characterId);
    }
  }
  return ids;
}

module.exports = {
  listOwned,
  hireCharacter,
  appointCharacter,
  totalSalaryExpense,
  getCharacterCount,
  getUnlockedCharacterIds,
  getCharacterTemplate,
  listCharacterTemplates,
};
