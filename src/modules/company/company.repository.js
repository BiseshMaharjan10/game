const { prisma } = require('../../config/prisma');

const companyRepository = {
	findByOwnerId(ownerId) {
		return prisma.company.findUnique({
			where: { ownerId },
			include: { articles: true, owner: true }
		});
	},
	create(data) {
		return prisma.company.create({ data });
	},
	update(id, data) {
		return prisma.company.update({ where: { id }, data });
	}
};

module.exports = { companyRepository };