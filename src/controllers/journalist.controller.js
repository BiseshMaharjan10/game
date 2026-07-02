const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/appError");
const {
  listOwned,
  hireCharacter,
  appointCharacter,
  listCharacterTemplates,
} = require("../services/journalist.service");

const VALID_CHARACTER_IDS = ['bob', 'robin', 'lisa', 'michael'];

function mapCharacters(owned) {
  return owned
    .filter(function (pc) { return pc.quantity > 0; })
    .map(function (pc) {
      return { characterId: pc.characterId, quantity: pc.quantity };
    });
}

const listCharactersHandler = asyncHandler(async (req, res) => {
  console.log(`[listCharactersHandler] START playerId=${req.user.id}`);
  const owned = await listOwned(req.user.id);
  console.log(`[listCharactersHandler] owned=${owned.length}`);
  res.json({ characters: mapCharacters(owned) });
});

const recruitCharacterHandler = asyncHandler(async (req, res) => {
  const tag = '[recruitCharacterHandler]';
  const _t0 = Date.now();
  let characterId = "";

  console.log(`${tag} ENTERED body=${JSON.stringify(req.body)}`);
  console.log(`${tag} user.id=${req.user.id}`);

  try {
    characterId = (req.body.characterId || req.body.character || req.body.name || "").toLowerCase();
    const purchaseType = req.body.purchaseType || "gems";
    const deskIndex = req.body.deskIndex;

    console.log(`${tag} characterId=${characterId} purchaseType=${purchaseType} deskIndex=${deskIndex}`);

    if (!VALID_CHARACTER_IDS.includes(characterId)) {
      console.log(`${tag} FAIL: invalid characterId=${characterId}`);
      return res.status(404).json({
        error: { message: "Character not found" },
      });
    }

    if (!["coins", "gems"].includes(purchaseType)) {
      console.log(`${tag} FAIL: invalid purchaseType=${purchaseType}`);
      return res.status(400).json({
        error: { message: "purchaseType must be 'coins' or 'gems'" },
      });
    }

    if (deskIndex == null || deskIndex < 1 || deskIndex > 8) {
      console.log(`${tag} FAIL: invalid deskIndex=${deskIndex}`);
      return res.status(400).json({
        error: { message: "deskIndex must be between 1 and 8" },
      });
    }

    console.log(`${tag} calling hireCharacter service`);
    const player = await hireCharacter(req.user.id, characterId, purchaseType, deskIndex);
    console.log(`${tag} service returned`);

    const owned = mapCharacters(
      player.characters.filter(function (pc) { return pc.quantity > 0; })
    );

    const desks = (player.desks || []).map(function (d) {
      return {
        deskIndex: d.deskIndex,
        unlocked: d.unlocked,
        assignedCharacterId: d.assignedCharacterId,
        cost: d.cost,
      };
    });

    const unlockedCount = desks.filter(function(d) { return d.unlocked; }).length;

    const response = {
      player: {
        coins: player.coins,
        gems: player.gems,
        company: player.company
          ? { name: player.company.name, level: player.company.level }
          : null,
        characters: owned,
      },
      desks: desks,
      unlocked_desks: unlockedCount,
    };
    const _t_serialize = Date.now();
    const jsonStr = JSON.stringify(response);
    console.log(`${tag} response=${jsonStr}`);
    console.log(`[RESPONSE] POST /characters/recruit unlocked_desks=${unlockedCount} desks=${JSON.stringify(desks.map(function(d) { return {deskIndex: d.deskIndex, unlocked: d.unlocked, assignedCharacterId: d.assignedCharacterId}; }))}`);
    res.status(201).json(JSON.parse(jsonStr));
    const _t_done = Date.now();

    console.log(`[TIMING] Authentication: N/A (logged in middleware)`);
    console.log(`[TIMING] hireCharacter service: ${_t_serialize - _t0} ms`);
    console.log(`[TIMING] JSON serialize + send: ${_t_done - _t_serialize} ms`);
    console.log(`[TIMING] TOTAL: ${_t_done - _t0} ms`);
  } catch (error) {
    console.error(`${tag} CAUGHT error message="${error.message}"`, error);

    console.error("=== ERROR DEBUG ===");
    console.error("constructor:", error?.constructor?.name);
    console.error("name:", error?.name);
    console.error("instanceof AppError:", error instanceof AppError);
    console.error("statusCode:", error?.statusCode);
    console.error("message:", error?.message);
    console.error("prototype:", Object.getPrototypeOf(error)?.constructor?.name);
    console.error("keys:", Object.keys(error));
    console.error("stack:", error?.stack);
    console.error("Imported AppError:", AppError);

    if (error instanceof AppError) {
      const msg = error.message === "character already recruited"
        ? characterId + " has already been recruited"
        : error.message === "insufficient gems"
          ? "Not enough gems to recruit " + characterId
          : error.message === "insufficient coins"
            ? "Not enough coins to recruit " + characterId
            : error.message;
      return res.status(error.statusCode).json({
        error: { message: msg },
      });
    }

    return res.status(500).json({
      error: { message: "An unexpected error occurred." },
    });
  }
});

const appointCharacterHandler = asyncHandler(async (req, res) => {
  const tag = '[appointCharacterHandler]';
  console.log(`${tag} ENTERED body=${JSON.stringify(req.body)}`);
  console.log(`${tag} user.id=${req.user.id}`);

  try {
    const characterId = (req.body.characterId || req.body.character || req.body.name || "").toLowerCase();
    console.log(`${tag} characterId=${characterId}`);

    if (!VALID_CHARACTER_IDS.includes(characterId)) {
      console.log(`${tag} FAIL: invalid characterId=${characterId}`);
      return res.status(404).json({
        error: { message: "Character not found" },
      });
    }

    console.log(`${tag} calling appointCharacter service`);
    const player = await appointCharacter(req.user.id, characterId);
    console.log(`${tag} service returned`);

    const owned = mapCharacters(
      player.characters.filter(function (pc) { return pc.quantity > 0; })
    );

    const response = {
      player: {
        coins: player.coins,
        gems: player.gems,
        company: player.company
          ? { name: player.company.name, level: player.company.level }
          : null,
        characters: owned,
      },
    };
    console.log(`${tag} response=${JSON.stringify(response)}`);

    return res.status(200).json(response);
  } catch (error) {
    console.error(`${tag} CAUGHT error message="${error.message}"`, error);

    if (error.message === "character not owned") {
      return res.status(400).json({
        error: { message: characterId + " is not owned" },
      });
    }
    if (error.message === "insufficient coins") {
      return res.status(400).json({
        error: { message: "Not enough coins to appoint " + characterId },
      });
    }

    return res.status(500).json({
      error: { message: "An unexpected error occurred." },
    });
  }
});

const listCharacterTemplatesHandler = asyncHandler(async (req, res) => {
  const templates = await listCharacterTemplates();
  res.json({ templates });
});

module.exports = {
  listCharactersHandler,
  recruitCharacterHandler,
  appointCharacterHandler,
  listCharacterTemplatesHandler,
};
