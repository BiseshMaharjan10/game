const { prisma } = require('../../config/prisma');

const playerRepository = {
  findByEmailOrUsername(identifier) {
    return prisma.player.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }]
      },
      include: { company: true, leaderboard: true }
    });
  },
  findById(id) {
    return prisma.player.findUnique({ where: { id }, include: { company: true, leaderboard: true } });
  },
  create(data) {
    return prisma.player.create({ data });
  },
  update(id, data) {
    return prisma.player.update({ where: { id }, data });
  },
  list() {
    return prisma.player.findMany({ include: { company: true, leaderboard: true } });
  }
};

const authSessionRepository = {
  create(data) {
    return prisma.authSession.create({ data });
  },
  findByTokenHash(refreshTokenHash) {
    return prisma.authSession.findFirst({ where: { refreshTokenHash } });
  },
  revoke(id) {
    return prisma.authSession.update({ where: { id }, data: { revokedAt: new Date() } });
  }
};

module.exports = { playerRepository, authSessionRepository };