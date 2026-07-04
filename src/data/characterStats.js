const CHARACTER_STATS = {
  bob:     { investigation: 30, speed: 80, ethics: 60 },
  robin:   { investigation: 85, speed: 40, ethics: 70 },
  lisa:    { investigation: 60, speed: 70, ethics: 90 },
  michael: { investigation: 75, speed: 50, ethics: 65 },
};

function getCharacterStats(characterId) {
  return CHARACTER_STATS[characterId] || null;
}

module.exports = { CHARACTER_STATS, getCharacterStats };
