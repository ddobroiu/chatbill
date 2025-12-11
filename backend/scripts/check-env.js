#!/usr/bin/env node

/**
 * Environment Variables Checker
 * Verifică că toate variabilele critice sunt setate
 */

const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET',
  'BASE_URL',
  'FRONTEND_URL'
];

const recommendedVars = [
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'OPENAI_API_KEY'
];

console.log('🔍 Verificare Environment Variables\n');
console.log('='.repeat(50));

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('\n📋 Variabile OBLIGATORII:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ❌ ${varName} - LIPSEȘTE`);
    hasErrors = true;
  } else if (value.includes('your-') || value.includes('example')) {
    console.log(`  ⚠️  ${varName} - Nu a fost configurat (placeholder value)`);
    hasErrors = true;
  } else {
    const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`  ✅ ${varName} - OK (${displayValue})`);
  }
});

// Check recommended variables
console.log('\n💡 Variabile RECOMANDATE:');
recommendedVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ⚠️  ${varName} - LIPSEȘTE (funcționalitate limitată)`);
    hasWarnings = true;
  } else if (value.includes('your-') || value.includes('example')) {
    console.log(`  ⚠️  ${varName} - Placeholder value`);
    hasWarnings = true;
  } else {
    const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`  ✅ ${varName} - OK (${displayValue})`);
  }
});

// Security checks
console.log('\n🔒 Verificări SECURITATE:');

const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret && jwtSecret.length < 32) {
  console.log('  ⚠️  JWT_SECRET prea scurt (minimum 32 caractere)');
  hasWarnings = true;
} else if (jwtSecret) {
  console.log('  ✅ JWT_SECRET lungime OK');
}

const sessionSecret = process.env.SESSION_SECRET;
if (sessionSecret && sessionSecret.length < 32) {
  console.log('  ⚠️  SESSION_SECRET prea scurt (minimum 32 caractere)');
  hasWarnings = true;
} else if (sessionSecret) {
  console.log('  ✅ SESSION_SECRET lungime OK');
}

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && databaseUrl.includes('localhost')) {
  console.log('  ⚠️  DATABASE_URL folosește localhost (nu va funcționa în production)');
  hasWarnings = true;
} else if (databaseUrl) {
  console.log('  ✅ DATABASE_URL configurare OK');
}

// Environment check
console.log('\n🌍 Environment:');
const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`  📍 NODE_ENV: ${nodeEnv}`);

if (nodeEnv === 'production') {
  console.log('  ✅ Production mode');

  // Extra production checks
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.includes('test')) {
    console.log('  ⚠️  Folosești Stripe TEST keys în production!');
    hasWarnings = true;
  }
} else {
  console.log('  ℹ️  Development mode');
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ ERORI GĂSITE - Deployment va eșua!\n');
  console.log('Rulează pentru a genera secrete:');
  console.log('  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  WARNING - Deployment va funcționa, dar unele feature-uri pot lipsi\n');
  process.exit(0);
} else {
  console.log('✅ Toate verificările au trecut! Deployment ready! 🚀\n');
  process.exit(0);
}
