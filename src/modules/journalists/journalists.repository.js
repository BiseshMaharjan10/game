const { prisma } = require('../../config/prisma');

const journalistRepository = {
	listByCompany(companyId) {
		return prisma.journalist.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
	},
	findById(id) {
		return prisma.journalist.findUnique({ where: { id } });
	},
	create(data) {
		return prisma.journalist.create({ data });
	},
	delete(id) {
		return prisma.journalist.delete({ where: { id } });
	},
	sumSalary(companyId) {
		return prisma.journalist.aggregate({ where: { companyId }, _sum: { salary: true } });
	},
	countByCompany(companyId) {
		return prisma.journalist.count({ where: { companyId } });
	}
};

module.exports = { journalistRepository };