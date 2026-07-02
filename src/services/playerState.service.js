const { AppError } = require("../utils/appError");
const { playerRepository } = require("../modules/auth/auth.repository");
const { companyRepository } = require("../modules/company/company.repository");
const { characterRepository } = require("../modules/journalists/journalists.repository");
const { deskRepository } = require("../modules/desks/desks.repository");
const { eventRepository } = require("../modules/events/events.repository");
const { getStats, getEconomy } = require("./economy.service");

function mapCharacters(playerCharacters) {
  return playerCharacters.map((pc) => ({
    characterId: pc.characterId,
    quantity: pc.quantity,
  }));
}

function mapEvents(events, playerEvents, company) {
  const assignmentsByEventId = new Map(
    (playerEvents || []).map((entry) => [entry.eventId, entry]),
  );

  return (events || []).map((event) => {
    const assignment = assignmentsByEventId.get(event.id);

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      required_tags: event.requiredTags || [],
      difficulty: event.difficulty,
      reward: event.reward,
      risk: event.risk,
      status: assignment ? assignment.status : event.status,
      progress: assignment ? assignment.progress : 0,
      company_name: company ? company.name : null,
    };
  });
}

function getNationalState(company, stats, economyData) {
  const reputation = company ? company.reputation : stats.reputation;
  const salaryExpense =
    economyData && economyData.salaryExpense != null
      ? economyData.salaryExpense
      : 0;

  if (reputation >= 70 && salaryExpense < 250) {
    return "stable";
  }

  if (reputation >= 50) {
    return "watchful";
  }

  if (reputation >= 30) {
    return "strained";
  }

  return "crisis";
}

function getInflation(company, characterCount, economyData) {
  const salaryExpense =
    economyData && economyData.salaryExpense != null
      ? economyData.salaryExpense
      : 0;
  const reputationPenalty = company
    ? Math.max(0, 100 - company.reputation)
    : 40;
  const characterPressure = characterCount * 3;

  return Math.max(
    0,
    Math.round(
      salaryExpense / 100 + reputationPenalty / 2 + characterPressure,
    ),
  );
}

async function buildPlayerState(playerId) {
  const player = await playerRepository.findById(playerId);
  if (!player) {
    throw new AppError("player not found", 404);
  }

  const [company, stats, economyData, allEvents, playerEvents] =
    await Promise.all([
      companyRepository.findByOwnerId(playerId),
      getStats(playerId),
      getEconomy(playerId),
      eventRepository.list(),
      eventRepository.listPlayerEvents(playerId),
    ]);

  const playerCharacters = await characterRepository.listByPlayer(playerId);
  const characterNames = playerCharacters.map((pc) => pc.characterId);
  const unlockedCharacters = playerCharacters.reduce(function (acc, pc) {
    for (let i = 0; i < pc.quantity; i++) {
      acc.push(pc.characterId);
    }
    return acc;
  }, []);

  let desks = await deskRepository.findByPlayerId(playerId);
  if (desks.length === 0) {
    await deskRepository.initializeForPlayer(playerId);
    desks = await deskRepository.findByPlayerId(playerId);
  }
  const mappedDesks = desks.map(function (d) {
    return {
      deskIndex: d.deskIndex,
      unlocked: d.unlocked,
      assignedCharacterId: d.assignedCharacterId,
      cost: d.cost,
    };
  });

  const unlockedCount = desks.filter(function(d) { return d.unlocked; }).length;
  const payload = {
    coin: player.coins,
    gems: player.gems,
    trust_score: player.trustScore,
    company_name: player.companyName || (company ? company.name : ""),
    unlocked_desks: unlockedCount,
    unlocked_characters: unlockedCharacters,
    desk_characters: mappedDesks.reduce(function (acc, d) {
      if (d.assignedCharacterId) {
        acc[String(d.deskIndex)] = d.assignedCharacterId;
      }
      return acc;
    }, {}),
    characters: mapCharacters(playerCharacters),
    desks: mappedDesks,
    stats: {
      match_active: Boolean(company),
      turn: playerEvents.length,
      max_turns: 40,
      reputation: company ? company.reputation : stats.reputation,
    },
    economy: {
      gdp:
        stats.companyValue != null ? stats.companyValue : player.companyValue,
      inflation: getInflation(company, playerCharacters.length, economyData),
      national_state: getNationalState(company, stats, economyData),
    },
    events: mapEvents(allEvents, playerEvents, company),
  };
  console.log(`[RESPONSE] GET /api/player/state unlocked_desks=${unlockedCount} desks=${JSON.stringify(mappedDesks)}`);
  return payload;
}

module.exports = { buildPlayerState };
