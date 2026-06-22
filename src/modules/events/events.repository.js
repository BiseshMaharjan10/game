const { prisma } = require('../../config/prisma');

const eventRepository = {
	list() {
		return prisma.event.findMany({ orderBy: { createdAt: 'asc' } });
	},
	findById(id) {
		return prisma.event.findUnique({ where: { id } });
	},
	create(data) {
		return prisma.event.create({ data });
	},
	findAssignment(playerId, eventId) {
		return prisma.playerEvent.findFirst({ where: { playerId, eventId }, include: { event: true, company: true } });
	},
	createAssignment(data) {
		return prisma.playerEvent.create({ data, include: { event: true, company: true } });
	},
	updateAssignment(id, data) {
		return prisma.playerEvent.update({ where: { id }, data, include: { event: true, company: true } });
	}
};

module.exports = { eventRepository };