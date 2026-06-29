const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // List all companies
  const all = await p.company.findMany();
  console.log('Companies:', all.length);
  for (const c of all) {
    console.log('  id=%s owner=%s level=%d money via player?', c.id, c.ownerId, c.level);
  }
  
  // Update all to level 1
  for (const c of all) {
    await p.company.update({ where: { id: c.id }, data: { level: 1, reputation: 50 } });
  }
  
  // Verify
  for (const c of await p.company.findMany()) {
    console.log('  After: id=%s level=%d', c.id, c.level);
  }
  
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
