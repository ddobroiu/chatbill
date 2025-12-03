// Wrapper pentru Prisma Client - SQLite edition
let prisma = null;

try {
  console.log('✅ Încărcare Prisma Client...');
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log('✅ Prisma Client încărcat cu SQLite');
} catch (err) {
  console.error('❌ Eroare încărcare Prisma:', err.message);
  prisma = null;
}

module.exports = prisma;
