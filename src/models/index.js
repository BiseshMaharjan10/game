function toPlayerDto(player) {
  return {
    id: player.id,
    companyName: player.companyName,
    email: player.email,
    money: player.coins,
    trustScore: player.trustScore,
    subscribers: player.gems,
    companyValue: player.companyValue
  };
}

function toCompanyDto(company) {
  if (!company) {
    return null;
  }

  return {
    id: company.id,
    ownerId: company.ownerId,
    name: company.name,
    level: company.level,
    reputation: company.reputation
  };
}

module.exports = { toPlayerDto, toCompanyDto };