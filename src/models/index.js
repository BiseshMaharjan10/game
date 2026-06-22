function toPlayerDto(player) {
  return {
    id: player.id,
    username: player.username,
    email: player.email,
    money: player.money,
    trustScore: player.trustScore,
    subscribers: player.subscribers,
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