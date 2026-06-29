const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const c = await p.company.findFirst();
  console.log('Before: level=%d', c.level);
  await p.company.update({ where: { id: c.id }, data: { level: 1, reputation: 50 } });
  const c2 = await p.company.findFirst();
  console.log('After: level=%d reputation=%d', c2.level, c2.reputation);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
