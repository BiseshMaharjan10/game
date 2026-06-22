const { prisma } = require('../../config/prisma');

const leaderboardRepository = {
	list() {
		return prisma.leaderboard.findMany({
			orderBy: [{ rank: 'asc' }, { score: 'desc' }],
			include: {
				player: {
					select: {
						id: true,
						username: true,
						email: true,
						money: true,
						trustScore: true,
						subscribers: true,
						companyValue: true
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