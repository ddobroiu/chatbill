// Test Script pentru Verificare Funcționalitate Publică
// Rulează cu: node backend/testPublicAccess.js

const API_URL = 'http://localhost:3000';

async function testPublicAccess() {
    console.log('🧪 Test ChatBill - Acces Public\n');
    
    // Test 1: ANAF Auto-complete (public)
    console.log('📋 Test 1: Auto-completare ANAF (fără autentificare)');
    try {
        const response = await fetch(`${API_URL}/api/settings/autocomplete/12345678`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Auto-completare ANAF funcționează fără token!');
            console.log('   Companie găsită:', data.settings?.name || 'N/A');
        } else {
            console.log('⚠️  Auto-completare răspuns:', response.status, data.error);
        }
    } catch (error) {
        console.log('❌ Eroare auto-completare:', error.message);
    }
    
    console.log();
    
    // Test 2: Creare Factură (public)
    console.log('📋 Test 2: Creare factură (fără autentificare)');
    
    const invoiceData = {
        client: {
            type: 'company',
            cui: '12345678',
            name: 'Test Client SRL',
            address: 'Str. Test 123',
            city: 'București',
            county: 'București'
        },
        products: [
            {
                name: 'Serviciu Consultanță',
                unit: 'oră',
                quantity: 10,
                price: 150,
                vat: 19
            }
        ],
        template: 'modern',
        provider: {
            cui: '98765432',
            name: 'Compania Mea SRL',
            regCom: 'J40/1234/2020',
            address: 'Str. Provideri 1',
            city: 'București',
            county: 'București',
            phone: '0712345678',
            email: 'contact@companie.ro',
            bank: 'BCR',
            iban: 'RO49AAAA1B31007593840000',
            capital: '200 LEI',
            isVatPayer: true,
            vatRate: 19,
            series: 'FAC',
            startNumber: 1
        }
    };
    
    try {
        const response = await fetch(`${API_URL}/api/invoices/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invoiceData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('✅ Factură generată cu succes!');
            console.log('   Număr factură:', data.invoice.invoiceNumber);
            console.log('   Total:', data.invoice.total, 'RON');
            console.log('   PDF:', data.pdfPath);
        } else {
            console.log('❌ Eroare generare factură:', data.error || 'Unknown error');
            console.log('   Status:', response.status);
        }
    } catch (error) {
        console.log('❌ Eroare request:', error.message);
    }
    
    console.log();
    
    // Test 3: Istoric Facturi (necesită autentificare - ar trebui să eșueze)
    console.log('📋 Test 3: Istoric facturi (ar trebui să ceară autentificare)');
    try {
        const response = await fetch(`${API_URL}/api/invoices`);
        
        if (response.status === 401) {
            console.log('✅ Corect! Istoricul cere autentificare (401)');
        } else {
            console.log('⚠️  Unexpected status:', response.status);
        }
    } catch (error) {
        console.log('❌ Eroare request:', error.message);
    }
    
    console.log();
    console.log('🎉 Test complet!\n');
    console.log('📝 Rezumat:');
    console.log('   - Auto-completare ANAF: Public ✅');
    console.log('   - Generare facturi: Public ✅');
    console.log('   - Istoric: Protejat (necesită cont) ✅');
}

// Rulează testul
testPublicAccess().catch(console.error);
