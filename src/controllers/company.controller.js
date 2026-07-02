const { asyncHandler } = require("../utils/asyncHandler");
const {
  getCompany,
  createCompany,
  upgradeCompany,
  syncPlayerCompanyValue,
  syncCompanyState,
} = require("../services/company.service");
const { playerRepository } = require("../modules/auth/auth.repository");
const { characterRepository } = require("../modules/journalists/journalists.repository");
const { deskRepository } = require("../modules/desks/desks.repository");

function mapDeskCharacters(company, characterIds) {
  const assignments =
    company && company.deskAssignments ? company.deskAssignments : {};
  if (Object.keys(assignments).length) {
    return assignments;
  }

  return (characterIds || []).reduce((accumulator, id, index) => {
    accumulator[String(index)] = id;
    return accumulator;
  }, {});
}

function mapCompanySnapshot(player, company, playerCharacters, characterIds, unlockedDesks, desks) {
  const mappedDesks = (desks || []).map(function (d) {
    return {
      deskIndex: d.deskIndex,
      unlocked: d.unlocked,
      assignedCharacterId: d.assignedCharacterId,
      cost: d.cost,
    };
  });
  return {
    company_name: company ? company.name : null,
    coin: player ? player.coins : 0,
    gems: player.gems,
    trust_score: player ? player.trustScore : 0,
    unlocked_desks: unlockedDesks,
    unlocked_characters:
      company && Array.isArray(company.unlockedCharacters)
        ? company.unlockedCharacters
        : characterIds,
    desk_characters: mapDeskCharacters(company, characterIds),
    characters: (playerCharacters || [])
      .filter(function (pc) { return pc.quantity > 0; })
      .map(function (pc) {
        return { characterId: pc.characterId, quantity: pc.quantity };
      }),
    desks: mappedDesks,
  };
}

const getCompanyHandler = asyncHandler(async (req, res) => {
  const company = await getCompany(req.user.id);
  if (!company) {
    return res.status(404).json({ error: { message: "company not found" } });
  }

  const playerData = await syncPlayerCompanyValue(req.user.id);
  const playerCharacters = await characterRepository.listByPlayer(req.user.id);
  const characterIds = playerCharacters
    .filter(function (pc) { return pc.quantity > 0; })
    .map(function (pc) { return pc.characterId; });

  const desks = await deskRepository.findByPlayerId(req.user.id);
  const unlockedDesks = desks.filter(function(d) { return d.unlocked; }).length;

  const payload = mapCompanySnapshot(playerData, company, playerCharacters, characterIds, unlockedDesks, desks);
  console.log(`[RESPONSE] GET /company unlocked_desks=${unlockedDesks} desks=${JSON.stringify(desks.map(function(d) { return {deskIndex: d.deskIndex, unlocked: d.unlocked}; }))}`);
  res.json(payload);
});

const createCompanyHandler = asyncHandler(async (req, res) => {
  const company = await createCompany(req.user.id, req.body.name);
  const playerData = await playerRepository.findById(req.user.id);
  const desks = await deskRepository.findByPlayerId(req.user.id);
  const unlockedDesks = desks.filter(function(d) { return d.unlocked; }).length;
  const payload = {
    ...mapCompanySnapshot(playerData, company, [], [], unlockedDesks, desks),
    message: "Company created",
  };
  console.log(`[RESPONSE] POST /company/create unlocked_desks=${unlockedDesks} desks=${JSON.stringify(desks.map(function(d) { return {deskIndex: d.deskIndex, unlocked: d.unlocked}; }))}`);
  res.status(201).json(payload);
});

const upgradeCompanyHandler = asyncHandler(async (req, res) => {
  const coinsOverride = req.body.coins;
  const { debug } = require("../utils/logger");
  debug(
    "[upgrade] coinsOverride=%s (type=%s)",
    coinsOverride,
    typeof coinsOverride,
  );
  const result = await upgradeCompany(req.user.id, coinsOverride);
  const playerAfter = await playerRepository.findById(req.user.id);
  const playerCharacters = await characterRepository.listByPlayer(req.user.id);
  const characterIds = playerCharacters
    .filter(function (pc) { return pc.quantity > 0; })
    .map(function (pc) { return pc.characterId; });

  const desks = await deskRepository.findByPlayerId(req.user.id);
  const unlockedDesks = desks.filter(function(d) { return d.unlocked; }).length;

  console.log(
    "[debug upgrade] success level=%d cost=%d coins=%d unlocked_desks=%d",
    result.company.level,
    result.cost,
    playerAfter.coins,
    unlockedDesks,
  );
  console.log(`[RESPONSE] POST /company/upgrade unlocked_desks=${unlockedDesks} desks=${JSON.stringify(desks.map(function(d) { return {deskIndex: d.deskIndex, unlocked: d.unlocked}; }))}`);
  res.json({
    ...mapCompanySnapshot(
      playerAfter,
      result.company,
      playerCharacters,
      characterIds,
      unlockedDesks,
      desks,
    ),
    coins_deducted: result.cost,
    coins_remaining: playerAfter.coins,
    message: "Desk purchased",
  });
});

const syncCompanyStateHandler = asyncHandler(async (req, res) => {
  const result = await syncCompanyState(req.user.id, req.body);
  const playerCharacters = await characterRepository.listByPlayer(req.user.id);
  const characterIds = playerCharacters
    .filter(function (pc) { return pc.quantity > 0; })
    .map(function (pc) { return pc.characterId; });

  const desks = await deskRepository.findByPlayerId(req.user.id);
  const unlockedDesks = desks.filter(function(d) { return d.unlocked; }).length;

  const payload = mapCompanySnapshot(
    result.player,
    result.company,
    playerCharacters,
    characterIds,
    unlockedDesks,
    desks,
  );
  console.log(`[RESPONSE] POST /company/sync unlocked_desks=${unlockedDesks} desks=${JSON.stringify(desks.map(function(d) { return {deskIndex: d.deskIndex, unlocked: d.unlocked}; }))}`);
  res.json(payload);
});

module.exports = {
  getCompanyHandler,
  createCompanyHandler,
  upgradeCompanyHandler,
  syncCompanyStateHandler,
};
