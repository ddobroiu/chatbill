// ========== API CONFIGURATION ==========
// Detectează automat URL-ul API-ului
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : window.location.origin;

console.log('🌐 API URL:', API_URL);

// ========== AUTHENTICATION ==========
function checkAuth() {
    const token = localStorage.getItem('token');
    return token !== null && token !== undefined && token !== '';
}

function isLoggedIn() {
    return checkAuth();
}

async function updateChatBanners() {
    const loggedIn = isLoggedIn();
    
    const guestBanner = document.getElementById('chat-guest-banner');
    const noSettingsBanner = document.getElementById('chat-no-settings-banner');
    const trialBanner = document.getElementById('chat-trial-banner');
    
    // Reset toate bannerele
    if (guestBanner) guestBanner.style.display = 'none';
    if (noSettingsBanner) noSettingsBanner.style.display = 'none';
    if (trialBanner) trialBanner.style.display = 'none';
    
    if (!loggedIn) {
        // Afișează banner pentru guest
        if (guestBanner) {
            guestBanner.style.display = 'block';
            // Re-inițializează iconurile
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    } else {
        // Utilizator logat - verifică setări și abonament
        try {
            // Verifică setările companiei
            const settingsResponse = await fetch(`${API_URL}/api/settings`, {
                headers: getAuthHeaders()
            });
            
            if (settingsResponse.ok) {
                const settingsData = await settingsResponse.json();
                
                if (!settingsData.settings || !settingsData.settings.name || !settingsData.settings.cui) {
                    // Nu are setări complete
                    if (noSettingsBanner) {
                        noSettingsBanner.style.display = 'block';
                        if (typeof lucide !== 'undefined') {
                            lucide.createIcons();
                        }
                    }
                } else {
                    // Are setări - verifică trial/abonament
                    // Aceasta va fi gestionată dinamic când GPT răspunde
                }
            }
        } catch (error) {
            console.error('Eroare verificare setări:', error);
        }
    }
}

async function loadUserData() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        // Încearcă să obții datele utilizatorului din token
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            return {
                id: payload.id,
                email: payload.email,
                name: payload.name || 'Utilizator'
            };
        }
    } catch (error) {
        console.error('Eroare decodare token:', error);
    }
    
    return null;
}

function updateUserInfo(userData) {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    
    if (userData && userName && userEmail && userAvatar) {
        userName.textContent = userData.name || 'Utilizator';
        userEmail.textContent = userData.email || '';
        
        // Initiale pentru avatar
        const initials = userData.name
            ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            : userData.email[0].toUpperCase();
        userAvatar.textContent = initials;
    }
}

function updateUIBasedOnAuth() {
    const loggedIn = isLoggedIn();
    
    // Elemente care trebuie ascunse pentru utilizatori nelogați
    const authOnlyElements = [
        document.querySelector('a[href="#dashboard"]')?.closest('.nav-item'),
        document.querySelector('.nav-item-parent[data-submenu="generator"]') || document.querySelector('.nav-parent-link[data-submenu="generator"]')?.closest('.nav-item-parent'),
        document.querySelector('.nav-item-parent[data-submenu="istoric"]') || document.querySelector('.nav-parent-link[data-submenu="istoric"]')?.closest('.nav-item-parent'),
        document.querySelector('#settings-toggle')?.closest('.nav-item'),
        document.querySelector('.sidebar-footer .user-info'),
        document.querySelector('a[href="#subscription"]'),
        document.querySelector('#logout-btn')
    ].filter(el => el !== null && el !== undefined);
    
    authOnlyElements.forEach(el => {
        if (el) {
            el.style.display = loggedIn ? '' : 'none';
        }
    });
    
    // Actualizează footer-ul sidebar-ului pentru utilizatori nelogați
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter && !loggedIn) {
        // Creează butoane de autentificare pentru utilizatori nelogați
        const authButtonsHTML = `
            <a href="register.html" class="btn btn-primary" style="width: 100%; margin-bottom: 0.5rem; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <i data-lucide="user-plus"></i>
                Creează cont
            </a>
            <a href="login.html" class="btn btn-secondary" style="width: 100%; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <i data-lucide="log-in"></i>
                Logare
            </a>
        `;
        sidebarFooter.innerHTML = authButtonsHTML;
        // Re-inițializează iconurile Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Helper to get authorization header
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json'
    };
}

// ========== TEMPLATE SELECTOR ==========
function initTemplateSelector() {
    const templateCards = document.querySelectorAll('.template-card');
    const selectedTemplateInput = document.getElementById('selectedTemplate');
    const selectedTemplateNameSpan = document.getElementById('selectedTemplateName');
    
    templateCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove selection from all cards
            templateCards.forEach(c => c.classList.remove('selected'));
            
            // Add selection to clicked card
            this.classList.add('selected');
            
            // Update hidden input and display
            const template = this.getAttribute('data-template');
            selectedTemplateInput.value = template;
            
            // Update selected template name with emoji
            const templateNames = {
                'modern': '🎨 Modern',
                'classic': '📋 Classic',
                'minimal': '⚪ Minimal',
                'elegant': '✨ Elegant'
            };
            selectedTemplateNameSpan.textContent = templateNames[template] || template;
            
            // Smooth scroll effect
            this.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });
    
    // Select Modern by default on page load
    const defaultCard = document.querySelector('[data-template="modern"]');
    if (defaultCard) {
        defaultCard.classList.add('selected');
    }
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
// IMPORTANT: Nu mai folosim DOMContentLoaded aici - inițializarea se face în index.html
// pentru a controla ordinea exactă de execuție

// Helper pentru colectarea datelor companiei emitente
function getProviderData() {
    // Încearcă să obții date din localStorage (salvate anterior)
    const savedSettings = localStorage.getItem('companySettings');
    
    // Sau citește direct din formular
    const cui = document.getElementById('settingsCui')?.value || 
                (savedSettings ? JSON.parse(savedSettings).cui : '');
    const name = document.getElementById('settingsName')?.value || 
                 (savedSettings ? JSON.parse(savedSettings).name : '');
    const regCom = document.getElementById('settingsRegCom')?.value || 
                   (savedSettings ? JSON.parse(savedSettings).regCom : '');
    const address = document.getElementById('settingsAddress')?.value || 
                    (savedSettings ? JSON.parse(savedSettings).address : '');
    const city = document.getElementById('settingsCity')?.value || 
                 (savedSettings ? JSON.parse(savedSettings).city : '');
    const county = document.getElementById('settingsCounty')?.value || 
                   (savedSettings ? JSON.parse(savedSettings).county : '');
    const phone = document.getElementById('settingsPhone')?.value || 
                  (savedSettings ? JSON.parse(savedSettings).phone : '');
    const email = document.getElementById('settingsEmail')?.value || 
                  (savedSettings ? JSON.parse(savedSettings).email : '');
    const bank = document.getElementById('settingsBank')?.value || 
                 (savedSettings ? JSON.parse(savedSettings).bank : '');
    const iban = document.getElementById('settingsIban')?.value || 
                 (savedSettings ? JSON.parse(savedSettings).iban : '');
    const capital = document.getElementById('settingsCapital')?.value || 
                    (savedSettings ? JSON.parse(savedSettings).capital : '');
    
    // Setări TVA
    const isVatPayer = document.getElementById('isVatPayer')?.checked !== false;
    const vatRate = parseFloat(document.getElementById('vatRate')?.value || '19');
    
    // Setări numerotare
    const series = document.getElementById('invoiceSeries')?.value || 'FAC';
    const startNumber = parseInt(document.getElementById('invoiceStartNumber')?.value || '1');
    
    return {
        cui,
        name,
        regCom,
        address,
        city,
        county,
        phone,
        email,
        bank,
        iban,
        capital,
        isVatPayer,
        vatRate,
        series,
        startNumber
    };
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/api/settings`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.settings) {
                populateSettingsForm(data.settings);
                // Salvează în localStorage pentru backup
                localStorage.setItem('companySettings', JSON.stringify(data.settings));
                return;
            }
        }
    } catch (error) {
        console.error('Eroare încărcare setări din backend:', error);
    }
    
    // Fallback - încarcă din localStorage pentru useri neautentificați
    const savedSettings = localStorage.getItem('companySettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            populateSettingsForm(settings);
            console.log('✅ Setări încărcate din localStorage');
        } catch (error) {
            console.error('Eroare parsare setări din localStorage:', error);
        }
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
        capital: 'settingsCapital',
        vatRate: 'vatRate',
        invoiceSeries: 'invoiceSeries',
        invoiceStartNumber: 'invoiceStartNumber',
        proformaSeries: 'proformaSeries',
        proformaStartNumber: 'proformaStartNumber'
    };

    Object.keys(mapping).forEach(key => {
        const input = document.getElementById(mapping[key]);
        if (input && settings[key] !== undefined && settings[key] !== null) {
            input.value = settings[key];
        }
    });
    
    // Checkbox pentru plătitor TVA
    const isVatPayerCheckbox = document.getElementById('isVatPayer');
    if (isVatPayerCheckbox && settings.isVatPayer !== undefined) {
        isVatPayerCheckbox.checked = settings.isVatPayer;
    }
}

async function autoCompleteSettings() {
    const cui = document.getElementById('settingsCuiSearch').value.trim();
    
    if (!cui) {
        showMessage('settingsMessage', 'Introduceți un CUI', 'error');
        return;
    }

    showMessage('settingsMessage', '🔍 Căutare date în ANAF...', 'info');

    try {
        const response = await fetch(`${API_URL}/api/settings/autocomplete/${cui}`);
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

    // Încearcă să salvezi în backend (pentru useri autentificați)
    // Dacă eșuează (401), salvează în localStorage
    try {
        const response = await fetch(`${API_URL}/api/settings`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(settings)
        });

        const data = await response.json();
        
        if (data.success) {
            showMessage('settingsMessage', '✅ Setări salvate cu succes!', 'success');
            // Salvează și în localStorage pentru backup
            localStorage.setItem('companySettings', JSON.stringify(settings));
        } else if (response.status === 401) {
            // User neautentificat - salvează doar în localStorage
            localStorage.setItem('companySettings', JSON.stringify(settings));
            showMessage('settingsMessage', '✅ Setări salvate local! Pentru salvare permanentă, creați un cont.', 'success');
        } else {
            showMessage('settingsMessage', '❌ Eroare la salvarea setărilor', 'error');
        }
    } catch (error) {
        console.error('Eroare salvare setări:', error);
        // Fallback - salvează în localStorage
        localStorage.setItem('companySettings', JSON.stringify(settings));
        showMessage('settingsMessage', '✅ Setări salvate local! Pentru salvare permanentă, creați un cont.', 'success');
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
        const response = await fetch(`${API_URL}/api/companies/search/${cui}`);
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

    // Colectează date companie emitentă din formular setări (pentru useri neautentificați)
    const provider = getProviderData();
    
    if (!provider.cui || !provider.name) {
        showMessage('invoiceMessage', '❌ Completați datele companiei în secțiunea Setări!', 'error');
        // Scroll to settings
        document.getElementById('company-settings').scrollIntoView({ behavior: 'smooth' });
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
        products: products,
        template: document.getElementById('selectedTemplate').value || 'modern',
        provider: provider // Include datele companiei emitente
    };

    try {
        const response = await fetch(`${API_URL}/api/invoices/create`, {
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
                    window.open(`${API_URL}/api/invoices/${data.invoice.id}/download`, '_blank');
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
        const response = await fetch(`${API_URL}/api/invoices`, {
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
        const response = await fetch(`${API_URL}/api/invoices/${invoiceId}`);
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
    window.open(`${API_URL}/api/invoices/${invoiceId}/download`, '_blank');
}

// ========== AI CHAT TAB ==========
let currentChatSessionId = null;

async function startChatSession() {
    try {
        const response = await fetch(`${API_URL}/api/ai-chat/start`, {
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
        const response = await fetch(`${API_URL}/api/ai-chat/message`, {
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
                const downloadMsg = `\n\n<a href="${API_URL}/api/invoices/${data.invoice.id}/download" target="_blank" style="color: #667eea; text-decoration: underline;">📥 Click aici pentru download PDF</a>`;
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
        const response = await fetch(`${API_URL}/api/anaf/status`, {
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
        const response = await fetch(`${API_URL}/api/anaf/connect`, {
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
        const response = await fetch(`${API_URL}/api/anaf/disconnect`, {
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
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Afișează mesajul utilizatorului
    displayGPTMessage('user', message);
    input.value = '';
    
    // Adaugă în istoric
    gptConversationHistory.push({ role: 'user', content: message });
    
    // Afișează indicator typing
    const messagesContainer = document.getElementById('chat-messages');
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
        const response = await fetch(`${API_URL}/api/gpt-chat/message`, {
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
            
            // Verifică dacă există informații despre permisiuni
            if (data.permission) {
                updateTrialBanner(data.permission);
            }
            
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

function updateTrialBanner(permission) {
    const trialBanner = document.getElementById('chat-trial-banner');
    const trialTitle = document.getElementById('trial-banner-title');
    const trialMessage = document.getElementById('trial-banner-message');
    
    if (!trialBanner || !trialTitle || !trialMessage) return;
    
    if (permission.inTrial && permission.canGenerate) {
        // În perioada de probă
        trialTitle.textContent = '⏰ Perioada de probă';
        trialMessage.textContent = `Încă ${permission.trialDaysLeft} ${permission.trialDaysLeft === 1 ? 'zi rămasă' : 'zile rămase'} în perioada de probă gratuită.`;
        trialBanner.style.display = 'block';
    } else if (permission.reason === 'subscription_required') {
        // Trial expirat
        trialTitle.textContent = '💳 Perioada de probă expirată';
        trialMessage.textContent = 'Pentru a continua să emiti facturi, activează un abonament.';
        trialBanner.style.display = 'block';
    } else if (permission.canGenerate && !permission.inTrial) {
        // Are abonament activ - ascunde banner-ul
        trialBanner.style.display = 'none';
    }
    
    // Re-inițializează iconurile
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function displayGPTMessage(role, message) {
    const messagesContainer = document.getElementById('chat-messages');
    
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
        const response = await fetch(`${API_URL}/api/gpt-chat/history`, {
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
    
    // Initialize offer generator
    initOfferGenerator();
});

// ========== INVOICE FILTERS ==========
function filterInvoices(status) {
    const buttons = document.querySelectorAll('.btn-filter');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.closest('.btn-filter').classList.add('active');
    
    const rows = document.querySelectorAll('.invoices-table tbody tr');
    rows.forEach(row => {
        if (status === 'all') {
            row.style.display = '';
        } else {
            const badge = row.querySelector('.status-badge');
            if (badge && badge.classList.contains(`status-${status}`)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// ========== OFFER GENERATOR ==========
let offerProducts = [];

function initOfferGenerator() {
    // Add initial product row for offer
    addOfferProduct();
    
    // Handle offer form submission
    const offerForm = document.getElementById('offer-form');
    if (offerForm) {
        offerForm.addEventListener('submit', handleOfferSubmit);
    }
    
    // Add product button
    const addBtn = document.getElementById('add-offer-product');
    if (addBtn) {
        addBtn.addEventListener('click', addOfferProduct);
    }
    
    // Client type toggle
    const clientTypeSelect = document.getElementById('offer-client-type');
    if (clientTypeSelect) {
        clientTypeSelect.addEventListener('change', toggleOfferClientFields);
    }
    
    // Auto-complete button
    const autocompleteBtn = document.getElementById('autocomplete-offer-client-btn');
    if (autocompleteBtn) {
        autocompleteBtn.addEventListener('click', autocompleteOfferClient);
    }
}

function addOfferProduct() {
    const container = document.getElementById('offer-products-container');
    const index = offerProducts.length;
    
    const productDiv = document.createElement('div');
    productDiv.className = 'product-item';
    productDiv.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Denumire Produs/Serviciu</label>
                <input type="text" class="offer-product-name" placeholder="ex: Dezvoltare Website" required>
            </div>
            <div class="form-group">
                <label>Cantitate</label>
                <input type="number" class="offer-product-quantity" value="1" min="0.01" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Preț Unitar (RON)</label>
                <input type="number" class="offer-product-price" placeholder="0.00" min="0" step="0.01" required>
            </div>
            <div class="form-group">
                <label>TVA %</label>
                <select class="offer-product-vat">
                    <option value="21">21%</option>
                    <option value="9">9%</option>
                    <option value="5">5%</option>
                    <option value="0">0%</option>
                </select>
            </div>
            <div class="form-group">
                <label>Total</label>
                <input type="text" class="offer-product-total" readonly placeholder="0.00 RON">
            </div>
            <div style="display: flex; align-items: flex-end;">
                <button type="button" class="btn btn-danger" onclick="removeOfferProduct(this)">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(productDiv);
    offerProducts.push({});
    
    // Add event listeners for calculation
    const inputs = productDiv.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', calculateOfferTotals);
        input.addEventListener('change', calculateOfferTotals);
    });
    
    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }
}

function removeOfferProduct(button) {
    const productItem = button.closest('.product-item');
    const index = Array.from(productItem.parentElement.children).indexOf(productItem);
    offerProducts.splice(index, 1);
    productItem.remove();
    calculateOfferTotals();
}

function calculateOfferTotals() {
    let subtotal = 0;
    let totalVAT = 0;
    
    const productItems = document.querySelectorAll('#offer-products-container .product-item');
    productItems.forEach((item, index) => {
        const quantity = parseFloat(item.querySelector('.offer-product-quantity').value) || 0;
        const price = parseFloat(item.querySelector('.offer-product-price').value) || 0;
        const vatRate = parseFloat(item.querySelector('.offer-product-vat').value) || 0;
        
        const productTotal = quantity * price;
        const productVAT = productTotal * (vatRate / 100);
        
        subtotal += productTotal;
        totalVAT += productVAT;
        
        item.querySelector('.offer-product-total').value = (productTotal + productVAT).toFixed(2) + ' RON';
    });
    
    const grandTotal = subtotal + totalVAT;
    
    document.getElementById('offer-summary-subtotal').textContent = subtotal.toFixed(2) + ' RON';
    document.getElementById('offer-summary-vat').textContent = totalVAT.toFixed(2) + ' RON';
    document.getElementById('offer-summary-total').textContent = grandTotal.toFixed(2) + ' RON';
}

function toggleOfferClientFields() {
    const clientType = document.getElementById('offer-client-type').value;
    const companyFields = document.getElementById('offer-company-fields');
    const individualFields = document.getElementById('offer-individual-fields');
    
    if (clientType === 'company') {
        companyFields.style.display = 'block';
        individualFields.style.display = 'none';
    } else {
        companyFields.style.display = 'none';
        individualFields.style.display = 'block';
    }
}

async function autocompleteOfferClient() {
    const cuiInput = document.getElementById('offer-client-cui');
    const cui = cuiInput.value.trim().replace(/[^0-9]/g, '');
    
    if (!cui) {
        alert('Vă rugăm să introduceți un CUI');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/settings/autocomplete/${cui}`);
        const data = await response.json();
        
        if (data.success && data.company) {
            document.getElementById('offer-client-name').value = data.company.name || '';
            document.getElementById('offer-client-cui').value = data.company.cui || '';
            alert('✅ Date completate automat din ANAF');
        } else {
            alert('❌ Nu s-au găsit informații pentru acest CUI');
        }
    } catch (error) {
        console.error('Eroare autocomplete:', error);
        alert('❌ Eroare la căutarea datelor');
    }
}

async function handleOfferSubmit(event) {
    event.preventDefault();
    
    const products = [];
    const productItems = document.querySelectorAll('#offer-products-container .product-item');
    
    productItems.forEach(item => {
        const name = item.querySelector('.offer-product-name').value;
        const quantity = parseFloat(item.querySelector('.offer-product-quantity').value);
        const price = parseFloat(item.querySelector('.offer-product-price').value);
        const vatRate = parseFloat(item.querySelector('.offer-product-vat').value);
        
        if (name && quantity && price) {
            products.push({ name, quantity, price, vatRate });
        }
    });
    
    if (products.length === 0) {
        alert('Vă rugăm să adăugați cel puțin un produs/serviciu');
        return;
    }
    
    const formData = new FormData(event.target);
    const clientType = formData.get('offer-client-type');
    
    const offerData = {
        title: formData.get('offer-title'),
        validity: parseInt(formData.get('offer-validity')),
        paymentTerms: formData.get('offer-payment-terms'),
        delivery: formData.get('offer-delivery'),
        notes: formData.get('offer-notes'),
        client: clientType === 'individual' ? {
            type: 'individual',
            firstName: formData.get('offer-client-firstName'),
            lastName: formData.get('offer-client-lastName'),
            email: formData.get('offer-client-email'),
            phone: formData.get('offer-client-phone')
        } : {
            type: 'company',
            name: formData.get('offer-client-name'),
            cui: formData.get('offer-client-cui'),
            email: formData.get('offer-client-email'),
            phone: formData.get('offer-client-phone')
        },
        products: products
    };
    
    console.log('Offer data:', offerData);
    
    // For now, just show success message
    // In production, you would send this to the backend
    alert('✅ Oferta a fost generată cu succes!\n\nÎn producție, aceasta va fi salvată în baza de date și va putea fi descărcată ca PDF.');
    
    // Reset form
    event.target.reset();
    document.getElementById('offer-products-container').innerHTML = '';
    offerProducts = [];
    addOfferProduct();
    calculateOfferTotals();
}

function previewOffer() {
    alert('🔍 Funcționalitatea de preview va fi disponibilă în curând!');
}

