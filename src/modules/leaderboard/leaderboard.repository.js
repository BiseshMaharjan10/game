const { prisma } = require('../../config/prisma');

const leaderboardRepository = {
	list() {
		return prisma.leaderboard.findMany({
			orderBy: [{ rank: 'asc' }, { score: 'desc' }],
			include: {
				player: {
					select: {
						id:           true,
						username:     true,
						email:        true,
						money:        true,
						trustScore:   true,
						subscribers:  true,
						companyValue: true,
						company:      true   // include company so mapper can use company.name as outlet name
					}
				}
			}
		});
	},
	upsert({ playerId, rank, score }) {
		return prisma.leaderboard.upsert({
			where: { playerId },
			update: { rank, score },
			create: { playerId, rank, score }
		});
	}
};

module.exports = { leaderboardRepository };