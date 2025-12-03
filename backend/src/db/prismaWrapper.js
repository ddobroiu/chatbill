// Wrapper pentru Prisma Client
let prisma = null;

try {
  console.log('✅ Încărcare Prisma Client...');
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log('✅ Prisma Client încărcat cu PostgreSQL (Railway)');
} catch (err) {
  console.error('❌ Eroare încărcare Prisma:', err.message);
  prisma = null;
}

module.exports = prisma;
