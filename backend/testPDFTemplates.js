// Test Script pentru Template-uri PDF - ChatBill
// Rulează cu: node testPDFTemplates.js

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api/invoices';

// Date de test comune
const testClient = {
  type: 'company',
  name: 'S.C. CLIENT EXEMPLU S.R.L.',
  cui: 'RO98765432',
  regCom: 'J40/9876/2020',
  address: 'Str. Diacritice nr. 10, Bl. Ă, Sc. Â, Ap. Î',
  city: 'București',
  county: 'București'
};

const testProducts = [
  {
    name: 'Servicii de consultanță IT - Implementare sistem',
    quantity: 10,
    price: 500,
    unit: 'ore',
    vat: 19
  },
  {
    name: 'Licență software - Pachet profesional',
    quantity: 5,
    price: 1200,
    unit: 'buc',
    vat: 19
  },
  {
    name: 'Găzduire și întreținere servere',
    quantity: 1,
    price: 800,
    unit: 'lună',
    vat: 19
  }
];

// Funcție helper pentru creare factură
async function createInvoice(template) {
  console.log(`\n🔵 Testez template: ${template.toUpperCase()}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        template: template,
        client: testClient,
        products: testProducts
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Factură creată cu succes!`);
      console.log(`   ID: ${data.invoice.id}`);
      console.log(`   Număr: ${data.invoice.invoiceNumber}`);
      console.log(`   Template: ${data.invoice.template}`);
      console.log(`   PDF: ${data.pdfPath}`);
      console.log(`   Total: ${data.invoice.total} RON`);
      return data.invoice;
    } else {
      console.error(`❌ Eroare: ${data.error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Eroare request: ${error.message}`);
    return null;
  }
}

// Funcție principală de test
async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     TEST SISTEM TEMPLATE-URI PDF - ChatBill v1.0         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\nTestează toate cele 4 template-uri cu text românesc (diacritice):\n');

  const templates = ['modern', 'classic', 'minimal', 'elegant'];
  const results = [];

  for (const template of templates) {
    const invoice = await createInvoice(template);
    results.push({
      template,
      success: invoice !== null,
      invoice
    });
    
    // Pauză între cereri
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Raport final
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    RAPORT FINAL                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  results.forEach(result => {
    const status = result.success ? '✅ SUCCES' : '❌ EȘUAT';
    const template = result.template.toUpperCase().padEnd(10);
    console.log(`${status} - ${template}`);
    
    if (result.success) {
      console.log(`         Factură: ${result.invoice.invoiceNumber}`);
      console.log(`         PDF:     ${result.invoice.pdfPath}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\n📊 Rezultate: ${successCount}/${totalCount} template-uri testate cu succes`);

  if (successCount === totalCount) {
    console.log('\n🎉 Toate template-urile funcționează perfect!');
    console.log('\n📁 PDF-urile generate se găsesc în: backend/invoices/\n');
  } else {
    console.log('\n⚠️ Unele template-uri au întâmpinat probleme. Verifică erorile de mai sus.\n');
  }
}

// Rulează testele
runTests().catch(error => {
  console.error('❌ Eroare fatală:', error);
  process.exit(1);
});

// Export pentru utilizare ca modul
module.exports = { createInvoice, runTests };
