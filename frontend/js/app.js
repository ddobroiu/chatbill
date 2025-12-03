// ========== AUTHENTICATION ==========
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        // Redirect to login
        window.location.href = '/login.html';
        return false;
    }
    
    // Display user info in header
    try {
        const userData = JSON.parse(user);
        document.getElementById('userName').textContent = userData.name;
        document.getElementById('userEmail').textContent = userData.email;
        
        // Set avatar initials
        const initials = userData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        document.getElementById('userAvatar').textContent = initials;
    } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
    }
    
    return true;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Helper to get authorization header
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

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
    
    // Load invoices when switching to invoices tab
    if (tabName === 'invoices') {
        loadInvoices();
    }
}

// ========== SETTINGS TAB ==========
window.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (!checkAuth()) {
        return;
    }
    
    loadSettings();
    checkANAFStatus();
    
    // Check for ANAF callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('anaf_connected') === 'true') {
        showMessage('settingsMessage', '✅ Conectat cu succes la ANAF e-Factura!', 'success');
        checkANAFStatus();
        // Clean URL
        window.history.replaceState({}, document.title, '/');
    } else if (urlParams.get('anaf_error')) {
        showMessage('settingsMessage', `❌ Eroare conectare ANAF: ${urlParams.get('anaf_error')}`, 'error');
        window.history.replaceState({}, document.title, '/');
    }
});

async function loadSettings() {
    try {
        const response = await fetch('http://localhost:3000/api/settings', {
            headers: getAuthHeaders()
        });
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
            headers: getAuthHeaders(),
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
            headers: getAuthHeaders(),
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

// ========== INVOICES LIST TAB ==========
async function loadInvoices() {
    const invoicesList = document.getElementById('invoicesList');
    invoicesList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Se încarcă facturile...</p>';
    
    try {
        const response = await fetch('http://localhost:3000/api/invoices', {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success && data.invoices && data.invoices.length > 0) {
            displayInvoicesTable(data.invoices);
        } else {
            invoicesList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">📋 Nu există facturi generate încă.</p>';
        }
    } catch (error) {
        console.error('Eroare încărcare facturi:', error);
        invoicesList.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 40px;">❌ Eroare la încărcarea facturilor</p>';
    }
}

function displayInvoicesTable(invoices) {
    const invoicesList = document.getElementById('invoicesList');
    
    let tableHTML = `
        <table class="invoices-table">
            <thead>
                <tr>
                    <th>Nr. Factură</th>
                    <th>Data</th>
                    <th>Client</th>
                    <th>Produse</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Acțiuni</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    invoices.forEach(invoice => {
        const itemCount = invoice.items ? invoice.items.length : 0;
        tableHTML += `
            <tr>
                <td><strong>${invoice.invoiceNumber}</strong></td>
                <td>${formatDate(invoice.issueDate)}</td>
                <td>${getClientName(invoice)}</td>
                <td>${itemCount} produse</td>
                <td><strong>${formatCurrency(invoice.total)}</strong></td>
                <td><span class="status-badge status-${invoice.status}">${getStatusLabel(invoice.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view-btn" onclick="viewInvoice('${invoice.id}')">👁️ Vezi</button>
                        <button class="action-btn download-btn" onclick="downloadInvoice('${invoice.id}')">⬇️ PDF</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    invoicesList.innerHTML = tableHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ro-RO', {
        style: 'currency',
        currency: 'RON'
    }).format(amount);
}

function getClientName(invoice) {
    if (invoice.clientType === 'company') {
        return invoice.clientName || 'Client necunoscut';
    } else {
        return `${invoice.clientFirstName || ''} ${invoice.clientLastName || ''}`.trim() || 'Client necunoscut';
    }
}

function getStatusLabel(status) {
    const labels = {
        'DRAFT': 'Draft',
        'SENT': 'Trimisă',
        'PAID': 'Plătită',
        'CANCELLED': 'Anulată'
    };
    return labels[status] || status;
}

async function viewInvoice(invoiceId) {
    try {
        const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}`);
        const data = await response.json();
        
        if (data.success && data.invoice) {
            displayInvoiceDetails(data.invoice);
        } else {
            alert('Eroare la încărcarea detaliilor facturii');
        }
    } catch (error) {
        console.error('Eroare vizualizare factură:', error);
        alert('Eroare la încărcarea facturii');
    }
}

function displayInvoiceDetails(invoice) {
    const itemsTable = invoice.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.unit}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${item.vatRate}%</td>
            <td>${formatCurrency(item.total)}</td>
        </tr>
    `).join('');
    
    const detailsHTML = `
        <div style="background: white; padding: 30px; max-width: 800px; margin: 20px auto; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #667eea;">Factură ${invoice.invoiceNumber}</h2>
                <button onclick="closeInvoiceDetails()" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">✕ Închide</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div>
                    <h3 style="color: #667eea; margin-bottom: 10px;">Furnizor</h3>
                    <p><strong>${invoice.providerName}</strong></p>
                    <p>CUI: ${invoice.providerCUI}</p>
                    <p>${invoice.providerAddress}</p>
                    <p>${invoice.providerCity}, ${invoice.providerCounty}</p>
                </div>
                <div>
                    <h3 style="color: #667eea; margin-bottom: 10px;">Client</h3>
                    <p><strong>${getClientName(invoice)}</strong></p>
                    ${invoice.clientType === 'company' ? `<p>CUI: ${invoice.clientCUI}</p>` : `<p>CNP: ${invoice.clientCNP || ''}</p>`}
                    <p>${invoice.clientAddress || ''}</p>
                    <p>${invoice.clientCity || ''}, ${invoice.clientCounty || ''}</p>
                </div>
            </div>
            
            <h3 style="color: #667eea; margin-bottom: 10px;">Produse/Servicii</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #f8f9ff;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #667eea;">Denumire</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #667eea;">UM</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">Cant.</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">Preț</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">TVA</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsTable}
                </tbody>
            </table>
            
            <div style="text-align: right; background: #f8f9ff; padding: 20px; border-radius: 10px;">
                <p style="margin: 5px 0;"><strong>Subtotal:</strong> ${formatCurrency(invoice.subtotal)}</p>
                <p style="margin: 5px 0;"><strong>TVA:</strong> ${formatCurrency(invoice.totalVat)}</p>
                <h3 style="color: #667eea; margin-top: 10px;">Total: ${formatCurrency(invoice.total)}</h3>
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="downloadInvoice('${invoice.id}')" style="background: #28a745; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-size: 16px;">⬇️ Descarcă PDF</button>
            </div>
        </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.id = 'invoiceDetailsOverlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; overflow-y: auto;';
    overlay.innerHTML = detailsHTML;
    document.body.appendChild(overlay);
}

function closeInvoiceDetails() {
    const overlay = document.getElementById('invoiceDetailsOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function downloadInvoice(invoiceId) {
    window.open(`http://localhost:3000/api/invoices/${invoiceId}/download`, '_blank');
}

// ========== AI CHAT TAB ==========
let currentChatSessionId = null;

async function startChatSession() {
    try {
        const response = await fetch('http://localhost:3000/api/ai-chat/start', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ source: 'web' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentChatSessionId = data.sessionId;
            displayChatMessage('assistant', data.message);
        }
    } catch (error) {
        console.error('Eroare start chat:', error);
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Display user message
    displayChatMessage('user', message);
    input.value = '';
    
    // Start session if needed
    if (!currentChatSessionId) {
        await startChatSession();
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/ai-chat/message', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                sessionId: currentChatSessionId,
                message: message,
                source: 'web'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayChatMessage('assistant', data.message);
            
            // If invoice generated, show download link
            if (data.invoice) {
                const downloadMsg = `\n\n<a href="http://localhost:3000/api/invoices/${data.invoice.id}/download" target="_blank" style="color: #667eea; text-decoration: underline;">📥 Click aici pentru download PDF</a>`;
                displayChatMessage('assistant', downloadMsg);
            }
        }
    } catch (error) {
        console.error('Eroare trimitere mesaj:', error);
        displayChatMessage('assistant', '❌ A apărut o eroare. Te rog încearcă din nou.');
    }
}

function displayChatMessage(role, message) {
    const messagesContainer = document.getElementById('chatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = message; // Allow HTML for links
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.appendChild(bubble);
    messageDiv.appendChild(time);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle Enter key in chat
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
});

// ========== ANAF e-FACTURA INTEGRATION ==========
async function checkANAFStatus() {
    try {
        const response = await fetch('http://localhost:3000/api/anaf/status', {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        const indicator = document.getElementById('anafStatusIndicator');
        const statusText = document.getElementById('anafStatusText');
        const connectionInfo = document.getElementById('anafConnectionInfo');
        const connectBtn = document.getElementById('anafConnectBtn');
        
        if (data.connected && !data.isExpired) {
            // Conectat
            indicator.classList.add('connected');
            statusText.textContent = 'Conectat la ANAF e-Factura';
            
            const expiresAt = new Date(data.expiresAt);
            const timeLeft = Math.floor((expiresAt - new Date()) / (1000 * 60)); // minute
            
            connectionInfo.innerHTML = `
                <strong>CUI:</strong> ${data.cui || 'N/A'} | 
                <strong>Companie:</strong> ${data.companyName || 'N/A'}<br>
                Token expiră în: ${timeLeft} minute
            `;
            
            connectBtn.textContent = '🔄 Deconectează';
            connectBtn.className = 'anaf-btn disconnect';
            connectBtn.onclick = disconnectFromANAF;
        } else {
            // Neconectat
            indicator.classList.remove('connected');
            statusText.textContent = 'Neconectat';
            connectionInfo.textContent = 'Pentru a putea transmite facturi în sistemul e-Factura ANAF, conectează-te cu certificatul digital SPV.';
            connectBtn.textContent = '🔗 Conectează cu SPV ANAF';
            connectBtn.className = 'anaf-btn';
            connectBtn.onclick = connectToANAF;
        }
    } catch (error) {
        console.error('Eroare verificare status ANAF:', error);
    }
}

async function connectToANAF() {
    try {
        const response = await fetch('http://localhost:3000/api/anaf/connect', {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success && data.authUrl) {
            // Redirect către ANAF pentru autentificare SPV
            showMessage('settingsMessage', '🔄 Redirectare către ANAF pentru autentificare...', 'info');
            setTimeout(() => {
                window.location.href = data.authUrl;
            }, 1000);
        } else {
            showMessage('settingsMessage', '❌ Eroare la inițierea conexiunii ANAF', 'error');
        }
    } catch (error) {
        console.error('Eroare conectare ANAF:', error);
        showMessage('settingsMessage', '❌ Eroare la conectarea cu ANAF', 'error');
    }
}

async function disconnectFromANAF() {
    if (!confirm('Sigur vrei să te deconectezi de la ANAF e-Factura?')) {
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/anaf/disconnect', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            showMessage('settingsMessage', '✅ Deconectat cu succes de la ANAF', 'success');
            checkANAFStatus();
        } else {
            showMessage('settingsMessage', '❌ Eroare la deconectare', 'error');
        }
    } catch (error) {
        console.error('Eroare deconectare ANAF:', error);
        showMessage('settingsMessage', '❌ Eroare la deconectare', 'error');
    }
}

// Refresh ANAF status every 5 minutes
setInterval(checkANAFStatus, 5 * 60 * 1000);

// ========== GPT CHAT ==========
let gptConversationHistory = [];

async function sendGPTMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Afișează mesajul utilizatorului
    displayGPTMessage('user', message);
    input.value = '';
    
    // Adaugă în istoric
    gptConversationHistory.push({ role: 'user', content: message });
    
    // Afișează indicator typing
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message assistant';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    try {
        const response = await fetch('http://localhost:3000/api/gpt-chat/message', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                message: message,
                conversationHistory: gptConversationHistory.slice(0, -1) // Ultimul e deja trimis
            })
        });
        
        // Șterge typing indicator
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
        
        const data = await response.json();
        
        if (data.success) {
            displayGPTMessage('assistant', data.message);
            gptConversationHistory.push({ role: 'assistant', content: data.message });
            
            // Log tokens folosiți
            if (data.usage) {
                console.log(`💰 Tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
            }
        } else {
            displayGPTMessage('assistant', `❌ ${data.error || 'Eroare la procesarea mesajului'}`);
        }
        
    } catch (error) {
        // Șterge typing indicator
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
        
        console.error('Eroare GPT Chat:', error);
        displayGPTMessage('assistant', '❌ Eroare de conexiune. Te rog încearcă din nou.');
    }
}

function displayGPTMessage(role, message) {
    const messagesContainer = document.getElementById('chatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // Convert markdown-like formatting to HTML
    let formattedMessage = message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/`(.*?)`/g, '<code>$1</code>') // Code
        .replace(/\n/g, '<br>'); // Line breaks
    
    bubble.innerHTML = formattedMessage;
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.appendChild(bubble);
    messageDiv.appendChild(time);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function clearGPTHistory() {
    if (!confirm('Sigur vrei să ștergi istoricul conversației?')) {
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/gpt-chat/history', {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            gptConversationHistory = [];
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.innerHTML = `
                <div class="gpt-welcome">
                    <h4>👋 Istoric șters!</h4>
                    <p>Poți începe o conversație nouă.</p>
                </div>
            `;
            console.log(`🗑️ Istoric șters: ${data.deletedCount} mesaje`);
        }
    } catch (error) {
        console.error('Eroare ștergere istoric:', error);
        alert('Eroare la ștergerea istoricului');
    }
}

// Enter key pentru GPT chat
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendGPTMessage();
            }
        });
    }
});
