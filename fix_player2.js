const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // Fix test@press.com money back to a reasonable value
  const pl = await p.player.findFirst({ where: { email: 'test@press.com' } });
  if (pl) {
    await p.player.update({ where: { id: pl.id }, data: { money: 20000 } });
    console.log('Set money=20000 for test@press.com');
  }
  // Also fix the other player
  const pl2 = await p.player.findFirst({ where: { email: 'player@example.com' } });
  if (pl2) {
    await p.player.update({ where: { id: pl2.id }, data: { money: 20000 } });
    console.log('Set money=20000 for player@example.com');
  }
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
