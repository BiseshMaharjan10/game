const { prisma } = require('../../config/prisma');

const TOTAL_DESKS = 8;
const INITIAL_UNLOCKED_COUNT = 1;

const deskRepository = {
  async initializeForPlayer(playerId, tx) {
    const client = tx || prisma;
    const existing = await client.desk.count({ where: { playerId } });
    if (existing > 0) return;

    const desks = [];
    for (let i = 1; i <= TOTAL_DESKS; i++) {
      desks.push({
        playerId,
        deskIndex: i,
        unlocked: i <= INITIAL_UNLOCKED_COUNT,
        assignedCharacterId: null,
        cost: 250 + i * 250,
      });
    }
    await client.desk.createMany({ data: desks });
  },

  findByPlayerId(playerId) {
    return prisma.desk.findMany({
      where: { playerId },
      orderBy: { deskIndex: 'asc' },
    });
  },

  findOne(playerId, deskIndex) {
    return prisma.desk.findUnique({
      where: { playerId_deskIndex: { playerId, deskIndex } },
    });
  },

  upsert(playerId, deskIndex, data) {
    return prisma.desk.upsert({
      where: { playerId_deskIndex: { playerId, deskIndex } },
      create: { playerId, deskIndex, ...data },
      update: data,
    });
  },

  assignCharacter(playerId, deskIndex, characterId, tx) {
    const client = tx || prisma;
    return client.desk.update({
      where: { playerId_deskIndex: { playerId, deskIndex } },
      data: { assignedCharacterId: characterId },
    });
  },

  unassignCharacter(playerId, deskIndex, tx) {
    const client = tx || prisma;
    return client.desk.update({
      where: { playerId_deskIndex: { playerId, deskIndex } },
      data: { assignedCharacterId: null },
    });
  },
};

module.exports = { deskRepository };
