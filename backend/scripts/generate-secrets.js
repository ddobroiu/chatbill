#!/usr/bin/env node

/**
 * Generate Secure Secrets
 * Generează secrete puternice pentru JWT și Session
 */

const crypto = require('crypto');

console.log('🔐 Generator Secrete pentru ChatBill\n');
console.log('='.repeat(50));

console.log('\n📝 Copiază aceste valori în .env:\n');

const jwtSecret = crypto.randomBytes(64).toString('hex');
const sessionSecret = crypto.randomBytes(64).toString('hex');

console.log('JWT_SECRET=' + jwtSecret);
console.log('SESSION_SECRET=' + sessionSecret);

console.log('\n' + '='.repeat(50));
console.log('✅ Secrete generate cu succes!');
console.log('\n💡 Tips:');
console.log('  - NICIODATĂ nu commita aceste secrete în Git');
console.log('  - Păstrează-le într-un password manager');
console.log('  - Folosește secrete diferite pentru dev și production');
console.log('  - Schimbă secretele dacă le compromite cineva\n');
