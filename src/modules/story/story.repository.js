const { prisma } = require('../../config/prisma');

const storyRepository = {
  listTemplates() {
    return prisma.storyTemplate.findMany({ orderBy: { createdAt: 'asc' } });
  },

  findTemplateById(id) {
    return prisma.storyTemplate.findUnique({ where: { id } });
  },

  createTemplate(data) {
    return prisma.storyTemplate.create({ data });
  },

  createStoryInstance(data) {
    return prisma.storyInstance.create({ data, include: { template: true } });
  },

  findStoryInstanceById(id) {
    return prisma.storyInstance.findUnique({ where: { id }, include: { template: true } });
  },

  listEvents() {
    return prisma.event.findMany({
      where: { status: 'available' },
      orderBy: { createdAt: 'asc' }
    });
  },

  findEventById(id) {
    return prisma.event.findUnique({ where: { id } });
  },

  listEventHistoryForStory(playerId, storyInstanceId) {
    return prisma.eventHistory.findMany({
      where: { playerId, storyInstanceId },
      include: { event: true }
    });
  },

  createEventHistory(data) {
    return prisma.eventHistory.create({ data });
  },

  findPlayerState(playerId) {
    return prisma.playerState.findUnique({ where: { playerId } });
  },

  upsertPlayerState(playerId, createData, updateData) {
    return prisma.playerState.upsert({
      where: { playerId },
      create: { playerId, ...createData },
      update: updateData || createData
    });
  },

  updatePlayerState(playerId, data) {
    return prisma.playerState.update({ where: { playerId }, data });
  },

  findCountryStateByKey(key = 'global') {
    return prisma.countryState.findUnique({ where: { key } });
  },

  upsertCountryState(key = 'global', createData, updateData) {
    return prisma.countryState.upsert({
      where: { key },
      create: { key, ...createData },
      update: updateData || createData
    });
  },

  updateCountryState(id, data) {
    return prisma.countryState.update({ where: { id }, data });
  }
};

module.exports = { storyRepository };
