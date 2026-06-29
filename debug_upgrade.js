const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const company = await prisma.company.findFirst();
  console.log('Company level:', company.level);
  console.log('Upgrade cost:', company.level * 500);
  
  const player = await prisma.player.findFirst();
  console.log('Player money:', player.money);
  console.log('Coins override would be: 500');
  console.log('coinsOverride !== undefined:', true);
  console.log('effectiveMoney (500) < upgradeCost (' + (company.level * 500) + '):', 500 < (company.level * 500));
  
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
