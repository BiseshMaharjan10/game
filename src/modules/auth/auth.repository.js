const { prisma } = require('../../config/prisma');

const playerRepository = {
  findByFirebaseUid(firebaseUid) {
    return prisma.player.findUnique({
      where: { firebaseUid },
      include: { company: true, leaderboard: true }
    });
  },
  findByEmail(email) {
    return prisma.player.findUnique({
      where: { email },
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

module.exports = { playerRepository };