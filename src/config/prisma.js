const { PrismaClient } = require('@prisma/client');

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

async function warmup() {
  try {
    await prisma.$connect();
    await prisma.$executeRaw`SELECT 1`;
    console.log('Prisma warmed up');
  } catch (err) {
    console.warn('Prisma warmup failed:', err.message);
  }
}

module.exports = { prisma, warmup };