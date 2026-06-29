const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const players = await p.player.findMany();
  for (const pl of players) {
    console.log('Player id=%s email=%s money=%d coin=%s', pl.id, pl.email, pl.money, pl.coin);
  }
  // Fix money for both players back to something reasonable
  for (const pl of players) {
    await p.player.update({ where: { id: pl.id }, data: { money: 2000, coin: 2000 } });
  }
  console.log('Fixed both players to money=2000 coin=2000');
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
