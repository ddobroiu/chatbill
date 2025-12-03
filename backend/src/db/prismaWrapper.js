// Wrapper pentru Prisma care nu se încarcă dacă DB nu e configurat
let prisma = null;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql://')) {
  try {
    prisma = require('./prisma');
    console.log('✅ Prisma client încărcat');
  } catch (err) {
    console.log('⚠️  Prisma nu a putut fi încărcat:', err.message);
  }
} else {
  console.log('⚠️  Prisma DEZACTIVAT (DATABASE_URL nu este configurat)');
}

module.exports = prisma;
