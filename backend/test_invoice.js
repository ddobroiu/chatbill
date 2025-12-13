// Test script pentru generare factură
const API_URL = 'http://localhost:3000';

async function testInvoiceGeneration() {
    console.log('🔵 Test generare factură...\n');

    const testData = {
        client: {
            type: 'company',
            name: 'Test SRL',
            cui: '12345678',
            regCom: 'J40/1234/2020',
            address: 'Str. Test, Nr. 1',
            city: 'București',
            county: 'București'
        },
        products: [
            {
                name: 'Produs Test 1',
                unit: 'buc',
                quantity: 2,
                price: 100,
                vat: 19
            },
            {
                name: 'Serviciu Test 2',
                unit: 'ore',
                quantity: 5,
                price: 50,
                vat: 19
            }
        ],
        template: 'modern',
        provider: {
            name: 'Compania Mea SRL',
            cui: '87654321',
            regCom: 'J40/5678/2021',
            address: 'Str. Furnizor, Nr. 10',
            city: 'București',
            county: 'București',
            email: 'contact@compania.ro',
            phone: '+40 123 456 789',
            iban: 'RO00BANK0000000000000000',
            bank: 'Banca Test',
            isVatPayer: true,
            vatRate: 19
        }
    };

    try {
        console.log('📤 Trimit request la:', `${API_URL}/api/invoices/create`);
        console.log('📦 Date:', JSON.stringify(testData, null, 2));

        const response = await fetch(`${API_URL}/api/invoices/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        console.log('\n📥 Status răspuns:', response.status);
        console.log('📥 Status OK:', response.ok);

        const data = await response.json();
        console.log('\n📦 Răspuns:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n✅ SUCCES! Factură generată:', data.invoice.invoiceNumber);
            console.log('📄 PDF:', data.pdfPath);
        } else {
            console.log('\n❌ EROARE:', data.error);
            if (data.details) console.log('Detalii:', data.details);
        }
    } catch (error) {
        console.error('\n❌ EROARE REQUEST:', error.message);
        console.error(error.stack);
    }
}

async function testProformaGeneration() {
    console.log('\n\n🔵 Test generare proforma...\n');

    const testData = {
        client: {
            type: 'company',
            name: 'Test Proforma SRL',
            cui: '98765432',
            regCom: 'J40/9876/2020',
            address: 'Str. Proforma, Nr. 2',
            city: 'Cluj-Napoca',
            county: 'Cluj'
        },
        products: [
            {
                name: 'Produs Proforma 1',
                unit: 'buc',
                quantity: 3,
                price: 150,
                vat: 19
            }
        ],
        template: 'modern'
    };

    try {
        console.log('📤 Trimit request la:', `${API_URL}/api/proformas`);
        console.log('📦 Date:', JSON.stringify(testData, null, 2));

        const response = await fetch(`${API_URL}/api/proformas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        console.log('\n📥 Status răspuns:', response.status);
        console.log('📥 Status OK:', response.ok);

        const data = await response.json();
        console.log('\n📦 Răspuns:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n✅ SUCCES! Proforma generată:', data.proforma.proformaNumber);
            console.log('📄 PDF:', data.proforma.pdfPath);
        } else {
            console.log('\n❌ EROARE:', data.error);
            if (data.details) console.log('Detalii:', data.details);
        }
    } catch (error) {
        console.error('\n❌ EROARE REQUEST:', error.message);
        console.error(error.stack);
    }
}

// Rulează testele
(async () => {
    await testInvoiceGeneration();
    await testProformaGeneration();
})();
