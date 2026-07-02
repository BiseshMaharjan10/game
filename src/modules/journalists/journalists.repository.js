const { prisma } = require('../../config/prisma');

const characterRepository = {
  findByPlayerAndId(playerId, characterId) {
    return prisma.playerCharacter.findUnique({
      where: { playerId_characterId: { playerId, characterId } },
    });
  },

  listByPlayer(playerId) {
    return prisma.playerCharacter.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    });
  },

  upsert(playerId, characterId, quantity) {
    return prisma.playerCharacter.upsert({
      where: { playerId_characterId: { playerId, characterId } },
      create: { playerId, characterId, quantity },
      update: { quantity },
    });
  },
};

module.exports = { characterRepository };
