// Test rapid - creează o factură cu template Modern
const fetch = require('node-fetch');

async function testModernTemplate() {
  console.log('🔵 Testez template MODERN cu diacritice românești...\n');
  
  const invoice = {
    template: 'modern',
    client: {
      type: 'company',
      name: 'S.C. TEST DIACRITICE S.R.L.',
      cui: 'RO12345678',
      regCom: 'J40/1234/2020',
      address: 'Str. Șoseaua Kiseleff nr. 1, Sector 1',
      city: 'București',
      county: 'Ilfov'
    },
    products: [
      {
        name: 'Servicii de întreținere și reparații echipamente',
        quantity: 5,
        price: 200,
        unit: 'ore',
        vat: 19
      },
      {
        name: 'Consultanță tehnică specializată',
        quantity: 3,
        price: 350,
        unit: 'ore',
        vat: 19
      }
    ]
  };

  try {
    const response = await fetch('http://localhost:3000/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice)
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ SUCCES! Factură creată!\n');
      console.log(`📄 Număr factură: ${data.invoice.invoiceNumber}`);
      console.log(`🎨 Template: ${data.invoice.template}`);
      console.log(`💰 Total: ${data.invoice.total} RON`);
      console.log(`📁 PDF generat: ${data.pdfPath}\n`);
      console.log(`🔗 Calea completă: backend/invoices/${data.pdfPath}\n`);
    } else {
      console.error('❌ Eroare:', data.error);
    }
  } catch (error) {
    console.error('❌ Eroare conexiune:', error.message);
  }
}

testModernTemplate();
