const { prisma } = require('../../config/prisma');

const newsRepository = {
  findByPlayerAndScenario(playerId, scenarioId) {
    return prisma.newsArticle.findUnique({
      where: { playerId_scenarioId: { playerId, scenarioId } },
    });
  },

  findById(id) {
    return prisma.newsArticle.findUnique({ where: { id } });
  },

  upsert(playerId, scenarioId, data) {
    return prisma.newsArticle.upsert({
      where: { playerId_scenarioId: { playerId, scenarioId } },
      create: { playerId, scenarioId, ...data },
      update: { ...data },
    });
  },

  update(id, data) {
    return prisma.newsArticle.update({ where: { id }, data });
  },

  findByRoom(roomId) {
    return prisma.newsArticle.findMany({
      where: { roomId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
    });
  },

  findByPlayer(playerId) {
    return prisma.newsArticle.findMany({
      where: { playerId },
      orderBy: { updatedAt: 'desc' },
    });
  },

  deleteByPlayerAndScenario(playerId, scenarioId) {
    return prisma.newsArticle.delete({
      where: { playerId_scenarioId: { playerId, scenarioId } },
    });
  },
};

module.exports = { newsRepository };
