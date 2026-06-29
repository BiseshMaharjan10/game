const { upgradeCompany } = require('./src/services/company.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const player = await prisma.player.findFirst();
  console.log('Player ID:', player.id, 'Money:', player.money);
  
  const company = await prisma.company.findFirst();
  console.log('Company level:', company.level, 'Cost:', company.level * 500);
  
  const coinsOverride = 500;
  console.log('coinsOverride:', coinsOverride, 'type:', typeof coinsOverride);
  console.log('coinsOverride !== undefined:', coinsOverride !== undefined);
  
  // Simulate what the upgrade function does
  const upgradeCost = company.level * 500;
  const effectiveMoney = coinsOverride !== undefined ? coinsOverride : player.money;
  console.log('upgradeCost:', upgradeCost, 'effectiveMoney:', effectiveMoney);
  console.log('effectiveMoney < upgradeCost:', effectiveMoney < upgradeCost);
  
  // Now actually call the real function
  try {
    const result = await upgradeCompany(player.id, coinsOverride);
    console.log('UPGRADE SUCCEEDED:', JSON.stringify(result));
  } catch (e) {
    console.log('UPGRADE FAILED:', e.message);
  }
  
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
