const { prisma } = require('../../config/prisma');

const articleRepository = {
	create(data) {
		return prisma.article.create({ data });
	},
	listByCompany(companyId) {
		return prisma.article.findMany({ where: { companyId }, orderBy: { publishedAt: 'desc' } });
	}
};

module.exports = { articleRepository };