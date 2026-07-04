const { prisma } = require('../../config/prisma');

const judgementRepository = {
  create(data) {
    return prisma.judgement.create({ data });
  },

  findByArticleId(articleId) {
    return prisma.judgement.findUnique({ where: { articleId } });
  },

  findByPlayerId(playerId) {
    return prisma.judgement.findMany({
      where: { playerId },
      orderBy: { judgedAt: 'desc' },
    });
  },

  findByRoomId(roomId) {
    return prisma.judgement.findMany({
      where: { roomId },
      orderBy: { judgedAt: 'desc' },
    });
  },

  findAll() {
    return prisma.judgement.findMany({
      orderBy: { judgedAt: 'desc' },
    });
  },
};

module.exports = { judgementRepository };
