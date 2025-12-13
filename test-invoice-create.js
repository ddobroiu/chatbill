const fetch = require('node-fetch');

const testData = {
  "invoiceNumber": "FAC000016",
  "provider": {
    "name": "CULOAREA DIN VIATA SA S.R.L.",
    "cui": "44820819",
    "registrationNumber": "J2021001108100",
    "address": {
      "street": "G TOPLICENI, Nr. 214, Cod postal 127630",
      "city": "Sat Topliceni Com. Topliceni",
      "county": "BUZAU",
      "country": "Romania"
    },
    "phone": "",
    "email": "contact@prynt.ro",
    "iban": "",
    "bankName": ""
  },
  "client": {
    "type": "company",
    "address": {
      "street": "G TOPLICENI, Nr. 214, Cod postal 127630",
      "city": "Sat Topliceni Com. Topliceni",
      "county": "BUZAU",
      "country": "Romania"
    },
    "name": "CULOAREA DIN VIATA SA S.R.L.",
    "cui": "44820819",
    "registrationNumber": "J2021001108100"
  },
  "products": [
    {
      "description": "sus",
      "unit": "buc",
      "quantity": 1,
      "unitPrice": 100,
      "vatRate": 19
    }
  ]
};

async function testInvoiceCreation() {
  try {
    const response = await fetch('http://localhost:3000/api/invoices/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testInvoiceCreation();
