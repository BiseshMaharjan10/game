const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const c = await p.company.findFirst();
  console.log('Before: level=%d reputation=%d', c.level, c.reputation);
  
  const player = await p.player.findFirst();
  // Undo the 500 coin deduction from the test
  await p.player.update({ where: { id: player.id }, data: { money: player.money + 500 } });
  
  await p.company.update({ where: { id: c.id }, data: { level: 1, reputation: 50 } });
  
  const c2 = await p.company.findFirst();
  const p2 = await p.player.findFirst();
  console.log('After: company level=%d reputation=%d player money=%d', c2.level, c2.reputation, p2.money);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
