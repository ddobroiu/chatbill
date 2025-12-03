// ========== TAB SWITCHING ==========
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

// ========== SETTINGS TAB ==========
window.addEventListener('DOMContentLoaded', loadSettings);

async function loadSettings() {
    try {
        const response = await fetch('http://localhost:3000/api/settings');
        const data = await response.json();
        
        if (data.success && data.settings) {
            populateSettingsForm(data.settings);
        }
    } catch (error) {
        console.error('Eroare încărcare setări:', error);
    }
}

function populateSettingsForm(settings) {
    const mapping = {
        cui: 'settingsCui',
        name: 'settingsName',
        address: 'settingsAddress',
        city: 'settingsCity',
        county: 'settingsCounty',
        regCom: 'settingsRegCom',
        phone: 'settingsPhone',
        email: 'settingsEmail',
        bank: 'settingsBank',
        iban: 'settingsIban',
        capital: 'settingsCapital'
    };

    Object.keys(mapping).forEach(key => {
        const input = document.getElementById(mapping[key]);
        if (input && settings[key]) {
            input.value = settings[key];
        }
    });
}

async function autoCompleteSettings() {
    const cui = document.getElementById('settingsCuiSearch').value.trim();
    
    if (!cui) {
        showMessage('settingsMessage', 'Introduceți un CUI', 'error');
        return;
    }

    showMessage('settingsMessage', '🔍 Căutare date în ANAF...', 'info');

    try {
        const response = await fetch(`http://localhost:3000/api/settings/autocomplete/${cui}`);
        const data = await response.json();
        
        if (data.success && data.settings) {
            populateSettingsForm(data.settings);
            showMessage('settingsMessage', '✅ Date completate automat din ANAF!', 'success');
        } else {
            showMessage('settingsMessage', '❌ Companie negăsită în ANAF', 'error');
        }
    } catch (error) {
        console.error('Eroare auto-completare:', error);
        showMessage('settingsMessage', '❌ Eroare la căutarea datelor', 'error');
    }
}

async function saveSettings(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const settings = Object.fromEntries(formData);

    showMessage('settingsMessage', '💾 Salvare setări...', 'info');

    try {
        const response = await fetch('http://localhost:3000/api/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        const data = await response.json();
        
        if (data.success) {
            showMessage('settingsMessage', '✅ Setări salvate cu succes!', 'success');
        } else {
            showMessage('settingsMessage', '❌ Eroare la salvarea setărilor', 'error');
        }
    } catch (error) {
        console.error('Eroare salvare setări:', error);
        showMessage('settingsMessage', '❌ Eroare la salvarea setărilor', 'error');
    }
}

// ========== INVOICE TAB ==========
function toggleClientType() {
    const isIndividual = document.getElementById('isIndividual').checked;
    const companyFields = document.getElementById('companyFields');
    const individualFields = document.getElementById('individualFields');
    
    if (isIndividual) {
        companyFields.style.display = 'none';
        individualFields.style.display = 'block';
        document.getElementById('clientCui').required = false;
        document.getElementById('clientFirstName').required = true;
        document.getElementById('clientLastName').required = true;
    } else {
        companyFields.style.display = 'block';
        individualFields.style.display = 'none';
        document.getElementById('clientCui').required = true;
        document.getElementById('clientFirstName').required = false;
        document.getElementById('clientLastName').required = false;
    }
}

async function searchClient() {
    const cui = document.getElementById('clientCuiSearch').value.trim();
    
    if (!cui) {
        showMessage('invoiceMessage', 'Introduceți un CUI', 'error');
        return;
    }

    showMessage('invoiceMessage', '🔍 Căutare client în ANAF...', 'info');

    try {
        const response = await fetch(`http://localhost:3000/api/companies/search/${cui}`);
        const data = await response.json();
        
        if (data.found) {
            const company = data.company;
            document.getElementById('clientCui').value = company.cui;
            document.getElementById('clientName').value = company.name;
            document.getElementById('clientAddress').value = company.address || '';
            document.getElementById('clientCity').value = company.city || '';
            document.getElementById('clientCounty').value = company.county || '';
            document.getElementById('clientRegCom').value = company.regCom || '';
            
            showMessage('invoiceMessage', `✅ Date client completate din ${data.source === 'iapp_api' ? 'ANAF' : 'baza locală'}!`, 'success');
        } else {
            showMessage('invoiceMessage', '❌ Client negăsit în ANAF. Completați manual.', 'error');
            document.getElementById('clientCui').value = cui;
        }
    } catch (error) {
        console.error('Eroare căutare client:', error);
        showMessage('invoiceMessage', '❌ Eroare la căutarea clientului', 'error');
    }
}

function addProduct() {
    const tbody = document.getElementById('productsBody');
    const newRow = tbody.rows[0].cloneNode(true);
    
    // Reset values
    newRow.querySelectorAll('input').forEach(input => {
        if (input.name === 'productUnit[]') input.value = 'buc';
        else if (input.name === 'productQty[]') input.value = '1';
        else if (input.name === 'productPrice[]') input.value = '0';
        else input.value = '';
    });
    newRow.querySelector('.row-total').textContent = '0.00 RON';
    
    tbody.appendChild(newRow);
}

function removeProduct(button) {
    const tbody = document.getElementById('productsBody');
    if (tbody.rows.length > 1) {
        button.closest('tr').remove();
        calculateTotal();
    } else {
        showMessage('invoiceMessage', 'Trebuie să existe cel puțin un produs!', 'error');
    }
}

function calculateRow(input) {
    const row = input.closest('tr');
    const qty = parseFloat(row.querySelector('input[name="productQty[]"]').value) || 0;
    const price = parseFloat(row.querySelector('input[name="productPrice[]"]').value) || 0;
    const vat = parseFloat(row.querySelector('select[name="productVat[]"]').value) || 0;
    
    const subtotal = qty * price;
    const total = subtotal * (1 + vat / 100);
    
    row.querySelector('.row-total').textContent = total.toFixed(2) + ' RON';
    calculateTotal();
}

function calculateTotal() {
    let subtotal = 0;
    let totalVat = 0;
    
    document.querySelectorAll('.product-row').forEach(row => {
        const qty = parseFloat(row.querySelector('input[name="productQty[]"]').value) || 0;
        const price = parseFloat(row.querySelector('input[name="productPrice[]"]').value) || 0;
        const vat = parseFloat(row.querySelector('select[name="productVat[]"]').value) || 0;
        
        const rowSubtotal = qty * price;
        const rowVat = rowSubtotal * (vat / 100);
        
        subtotal += rowSubtotal;
        totalVat += rowVat;
    });
    
    const total = subtotal + totalVat;
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2) + ' RON';
    document.getElementById('totalVat').textContent = totalVat.toFixed(2) + ' RON';
    document.getElementById('total').textContent = total.toFixed(2) + ' RON';
}

async function generateInvoice(event) {
    event.preventDefault();
    
    showMessage('invoiceMessage', '📄 Generare factură...', 'info');

    const isIndividual = document.getElementById('isIndividual').checked;
    const formData = new FormData(event.target);
    
    // Collect products
    const products = [];
    const productRows = document.querySelectorAll('.product-row');
    productRows.forEach(row => {
        const name = row.querySelector('input[name="productName[]"]').value;
        const unit = row.querySelector('input[name="productUnit[]"]').value;
        const quantity = parseFloat(row.querySelector('input[name="productQty[]"]').value);
        const price = parseFloat(row.querySelector('input[name="productPrice[]"]').value);
        const vat = parseFloat(row.querySelector('select[name="productVat[]"]').value);
        
        if (name && quantity > 0 && price >= 0) {
            products.push({ name, unit, quantity, price, vat });
        }
    });

    if (products.length === 0) {
        showMessage('invoiceMessage', '❌ Adăugați cel puțin un produs/serviciu!', 'error');
        return;
    }

    const invoiceData = {
        client: isIndividual ? {
            type: 'individual',
            firstName: formData.get('clientFirstName'),
            lastName: formData.get('clientLastName'),
            cnp: formData.get('clientCNP'),
            address: formData.get('clientAddress'),
            city: formData.get('clientCity'),
            county: formData.get('clientCounty')
        } : {
            type: 'company',
            cui: formData.get('clientCui'),
            name: formData.get('clientName'),
            regCom: formData.get('clientRegCom'),
            address: formData.get('clientAddress'),
            city: formData.get('clientCity'),
            county: formData.get('clientCounty')
        },
        products: products
    };

    try {
        const response = await fetch('http://localhost:3000/api/invoices/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invoiceData)
        });

        const data = await response.json();
        
        if (data.success) {
            showMessage('invoiceMessage', `✅ Factură ${data.invoice.invoiceNumber} generată cu succes!`, 'success');
            
            // Resetează formularul
            event.target.reset();
            document.getElementById('productsBody').innerHTML = '';
            addProduct(); // Adaugă un rând gol
            
            // Oferă opțiunea de download
            setTimeout(() => {
                if (confirm('Factură generată! Doriți să descărcați PDF-ul?')) {
                    window.open(`http://localhost:3000/api/invoices/${data.invoice.id}/download`, '_blank');
                }
            }, 1000);
        } else {
            showMessage('invoiceMessage', `❌ ${data.error || 'Eroare la generarea facturii'}`, 'error');
        }
    } catch (error) {
        console.error('Eroare generare factură:', error);
        showMessage('invoiceMessage', '❌ Eroare la comunicarea cu serverul', 'error');
    }
}

// ========== UTILITY ==========
function showMessage(elementId, text, type) {
    const messageDiv = document.getElementById(elementId);
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}
