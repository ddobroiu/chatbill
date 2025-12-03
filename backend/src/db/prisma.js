const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Test conexiune la pornire
prisma.$connect()
  .then(() => console.log('✅ Conectat la baza de date PostgreSQL'))
  .catch((err) => console.error('❌ Eroare conectare DB:', err));

module.exports = prisma;
