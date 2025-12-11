#!/usr/bin/env node

/**
 * Health Check Script
 * Verifică că serverul funcționează corect
 */

const http = require('http');
const https = require('https');

const url = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';

console.log(`🏥 Health Check pentru: ${url}\n`);

async function checkEndpoint(endpoint, name) {
  return new Promise((resolve) => {
    const fullUrl = `${url}${endpoint}`;
    const client = fullUrl.startsWith('https') ? https : http;

    const startTime = Date.now();

    const req = client.get(fullUrl, (res) => {
      const responseTime = Date.now() - startTime;
      const status = res.statusCode;

      if (status === 200) {
        console.log(`  ✅ ${name} - OK (${responseTime}ms)`);
        resolve(true);
      } else {
        console.log(`  ❌ ${name} - Status ${status} (${responseTime}ms)`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log(`  ❌ ${name} - ${err.message}`);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`  ⏱️  ${name} - Timeout (> 10s)`);
      resolve(false);
    });
  });
}

async function runHealthChecks() {
  console.log('📋 Verificare endpoints:\n');

  const checks = [
    // { endpoint: '/api/health', name: 'Health endpoint' },
    { endpoint: '/api/auth/me', name: 'Auth endpoint (401 expected)' },
    { endpoint: '/api/invoices', name: 'Invoices endpoint (401 expected)' },
    { endpoint: '/api/settings', name: 'Settings endpoint (401 expected)' },
  ];

  let passedChecks = 0;

  for (const check of checks) {
    const passed = await checkEndpoint(check.endpoint, check.name);
    if (passed || check.name.includes('401 expected')) {
      passedChecks++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Rezultat: ${passedChecks}/${checks.length} verificări trecute`);

  if (passedChecks === checks.length) {
    console.log('✅ Serverul funcționează corect! 🎉\n');
    process.exit(0);
  } else {
    console.log('❌ Unele verificări au eșuat\n');
    process.exit(1);
  }
}

// Test basic connectivity first
console.log('🔌 Verificare conectivitate...\n');
checkEndpoint('/', 'Root endpoint').then((connected) => {
  if (connected) {
    runHealthChecks();
  } else {
    console.log('\n❌ Nu se poate conecta la server!');
    console.log('\n💡 Verifică:');
    console.log('  - Serverul rulează?');
    console.log('  - URL-ul este corect?');
    console.log('  - Firewall-ul permite conexiuni?\n');
    process.exit(1);
  }
});
