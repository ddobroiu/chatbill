// ========== API CONFIGURATION ==========
// Version: 2025-12-12-20:15 - FIXED USER DELETION DETECTION
// Detectează automat URL-ul API-ului (robust pentru file:// sau preview local)
let API_URL;
try {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isFileProtocol = window.location.protocol === 'file:' || !window.location.hostname;
    if (isLocalhost || isFileProtocol) {
        API_URL = 'http://localhost:3000';
    } else {
        API_URL = window.location.origin;
    }
} catch {
    API_URL = 'http://localhost:3000';
}

console.log('🌐 API URL:', API_URL);
console.log('📦 App.js version: 2025-12-12-20:15');

// ========== AUTHENTICATION ==========
function checkAuth() {
    console.log('🔍 ========== checkAuth START ==========');
    const token = localStorage.getItem('token');
    console.log('📍 Token din localStorage:', token ? `EXISTS (${token.substring(0, 50)}...)` : 'NULL');
    
    if (!token) {
        console.log('❌ checkAuth RESULT: Nu există token');
        return false;
    }
    
    try {
        // Verifică dacă token-ul e valid (poate fi decodat)
        const parts = token.split('.');
        console.log('📍 Token parts:', parts.length);
        if (parts.length !== 3) {
            console.log('❌ checkAuth RESULT: Token invalid (format greșit - trebuie 3 părți)');
            clearAuthData();
            return false;
        }
        
        const payload = JSON.parse(atob(parts[1]));
        console.log('📍 Token payload:', payload);
        
        // Verifică dacă token-ul a expirat
        if (payload.exp) {
            const exp = payload.exp * 1000;
            const now = Date.now();
            console.log('📍 Token expiry:', new Date(exp).toISOString(), 'Now:', new Date(now).toISOString());
            if (exp < now) {
                console.log('❌ checkAuth RESULT: Token EXPIRAT');
                clearAuthData();
                return false;
            }
        }
        
        console.log('✅ checkAuth RESULT: Token VALID local (format corect, neexpirat)');
        console.log('🔍 ========== checkAuth END ==========');
        return true;
    } catch (error) {
        console.error('❌ checkAuth RESULT: Eroare la validare:', error);
        clearAuthData();
        return false;
    }
}

function clearAuthData() {
    console.log('🧹 Curățare date autentificare...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

function isLoggedIn() {
    return checkAuth();
}

// Verificare token pe server - returnează true dacă e valid, false altfel
async function verifyTokenOnServer() {
    console.log('🌐 ========== verifyTokenOnServer START ==========');
    const token = localStorage.getItem('token');

    if (!token) {
        console.log('❌ verifyTokenOnServer RESULT: Nu există token');
        return false;
    }

    try {
        console.log('📍 Calling API:', `${API_URL}/api/auth/me`);

        // Timeout de 5 secunde pentru request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: getAuthHeaders(),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('📍 Response status:', response.status);

        // Token invalid SAU utilizator șters/inexistent
        if (response.status === 401 || response.status === 403 || response.status === 404) {
            console.log('❌ verifyTokenOnServer RESULT: Token INVALID pe server (401/403/404 - user deleted)');
            clearAuthData();
            return false;
        }

        if (!response.ok) {
            console.log('⚠️ verifyTokenOnServer RESULT: Eroare server:', response.status);
            clearAuthData(); // Clear auth pentru orice eroare, pentru siguranță
            return false;
        }

        const data = await response.json();
        console.log('📍 Server response data:', data);

        // Verifică dacă răspunsul conține date user valide
        if (!data.success || !data.user) {
            console.log('❌ verifyTokenOnServer RESULT: Răspuns invalid (fără user data)');
            clearAuthData();
            return false;
        }

        console.log('✅ verifyTokenOnServer RESULT: Token VALID pe server');
        console.log('🌐 ========== verifyTokenOnServer END ==========');
        return true;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ verifyTokenOnServer TIMEOUT: Request a durat prea mult (>5s)');
        } else {
            console.error('❌ verifyTokenOnServer RESULT: Eroare request:', error);
        }
        clearAuthData(); // Clear auth și în caz de eroare de rețea
        return false;
    }
}

async function updateChatBanners() {
    const loggedIn = isLoggedIn();
    
    const guestBanner = document.getElementById('chat-guest-banner');
    const noSettingsBanner = document.getElementById('chat-no-settings-banner');
    const trialBanner = document.getElementById('chat-trial-banner');
    const phoneVerificationBanner = document.getElementById('chat-phone-verification-banner');
    
    // Reset toate bannerele
    if (guestBanner) guestBanner.style.display = 'none';
    if (noSettingsBanner) noSettingsBanner.style.display = 'none';
    if (trialBanner) trialBanner.style.display = 'none';
    if (phoneVerificationBanner) phoneVerificationBanner.style.display = 'none';
    
    if (!loggedIn) {
        // Afișează banner pentru guest
        if (guestBanner) {
            guestBanner.style.display = 'block';
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    } else {
        // Utilizator logat - verifică telefon, setări și abonament
        try {
            // Verifică user info pentru telefon verificat
            const meResponse = await fetch(`${API_URL}/api/auth/me`, {
                headers: getAuthHeaders()
            });
            
            if (meResponse.ok) {
                const meData = await meResponse.json();
                
                // Verifică dacă telefonul e verificat
                if (!meData.user.phoneVerified) {
                    if (phoneVerificationBanner) {
                        phoneVerificationBanner.style.display = 'block';
                        setupPhoneVerification(); // Adaugă event listeners
                        if (typeof lucide !== 'undefined') {
                            lucide.createIcons();
                        }
                    }
                    return; // Nu afișa alte bannere dacă telefonul nu e verificat
                }
            }
            
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

function setupPhoneVerification() {
    const verifyBtn = document.getElementById('verify-phone-btn');
    const resendBtn = document.getElementById('resend-phone-code-btn');
    const codeInput = document.getElementById('phone-verification-code');
    
    if (verifyBtn && !verifyBtn.dataset.listenerAdded) {
        verifyBtn.dataset.listenerAdded = 'true';
        verifyBtn.addEventListener('click', async () => {
            const code = codeInput.value.trim();
            
            if (!code || code.length !== 6) {
                alert('Introdu un cod valid de 6 cifre');
                return;
            }
            
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i data-lucide="loader-2"></i> Verificare...';
            lucide.createIcons();
            
            try {
                const response = await fetch(`${API_URL}/api/auth/verify-phone`, {
                    method: 'POST',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ code })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ ' + data.message);
                    updateChatBanners(); // Refresh banners
                    codeInput.value = '';
                } else {
                    alert('❌ ' + (data.error || 'Cod invalid'));
                }
            } catch (error) {
                console.error('Eroare verificare:', error);
                alert('❌ Eroare la verificare');
            } finally {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i data-lucide="check"></i> Verifică';
                lucide.createIcons();
            }
        });
    }
    
    if (resendBtn && !resendBtn.dataset.listenerAdded) {
        resendBtn.dataset.listenerAdded = 'true';
        resendBtn.addEventListener('click', async () => {
            resendBtn.disabled = true;
            resendBtn.innerHTML = '<i data-lucide="loader-2"></i>';
            lucide.createIcons();
            
            try {
                const response = await fetch(`${API_URL}/api/auth/resend-phone-code`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ ' + data.message);
                } else {
                    alert('❌ ' + (data.error || 'Eroare la retrimitere'));
                }
            } catch (error) {
                console.error('Eroare retrimitere:', error);
                alert('❌ Eroare la retrimitere');
            } finally {
                resendBtn.disabled = false;
                resendBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Retrimite';
                lucide.createIcons();
            }
        });
    }
}

async function loadUserData() {
    if (!isLoggedIn()) {
        console.log('❌ loadUserData: User nu e logat');
        return null;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            
            // Verifică din nou expirarea
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                console.log('❌ loadUserData: Token expirat');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.reload();
                return null;
            }
            
            const userData = {
                id: payload.id,
                email: payload.email,
                name: payload.name || payload.email
            };
            
            console.log('✅ loadUserData: Date user încărcate:', userData.email);
            return userData;
        }
    } catch (error) {
        console.error('❌ loadUserData: Eroare:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    }
    
    return null;
}

function updateUserInfo(userData) {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    
    if (!userData) {
        console.warn('Nu există date utilizator pentru afișare');
        return;
    }
    
    console.log('📊 Afișare date utilizator:', userData);
    
    if (userName) {
        userName.textContent = userData.name || userData.email || 'Utilizator';
    }
    
    if (userEmail) {
        userEmail.textContent = userData.email || '';
    }
    
    if (userAvatar) {
        // Initiale pentru avatar
        const nameForInitials = userData.name || userData.email;
        const initials = nameForInitials
            ? nameForInitials.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            : 'U';
        userAvatar.textContent = initials;
    }
}

async function updateUIBasedOnAuth() {
    console.log('\n\n🚀 ========================================');
    console.log('🚀 updateUIBasedOnAuth START');
    console.log('🚀 ========================================');

    const loader = document.getElementById('auth-loader');
    if (loader) loader.style.display = 'flex';

    try {
        const hasLocalToken = !!localStorage.getItem('token');
        let loggedIn = false;

        console.log('📍 STEP 1: Check local token existence:', hasLocalToken ? '✅ TOKEN EXISTS' : '❌ NO TOKEN');

        if (hasLocalToken) {
            console.log('📍 STEP 2: Token exists locally, verifying with server...');
            let serverValid = false;
            try {
                serverValid = await verifyTokenOnServer();
            } catch (verErr) {
                console.error('⚠️ verifyTokenOnServer threw error, treating as invalid:', verErr);
                serverValid = false;
            }
            console.log('📍 STEP 3: Server validation result:', serverValid ? '✅ VALID' : '❌ INVALID');
            
            if (serverValid) {
                loggedIn = true;
            } else {
                console.error('❌❌❌ TOKEN INVALID ON SERVER - Clearing all auth data...');
                clearAuthData();
                loggedIn = false;
            }
        } else {
            console.log('📍 STEP 2 & 3: SKIPPED (no local token)');
        }

        console.log('\n🎯 ======================================');
        console.log('🎯 FINAL AUTH STATUS:', loggedIn ? '✅✅✅ LOGGED IN' : '❌❌❌ GUEST MODE');
        console.log('🎯 ======================================\n');

        if (!loggedIn) {
        console.log('👤👤👤 ENTERING GUEST MODE - Setting up UI...');

        // Ascunde tot în afară de chat
        const hideElements = [
            document.querySelector('a[href="#dashboard"]')?.closest('.nav-item'),
            document.querySelector('.nav-item-parent[data-submenu="generator"]'),
            document.querySelector('.nav-item-parent[data-submenu="istoric"]'),
            document.querySelector('#settings-toggle')?.closest('.nav-item-parent')
        ];

        console.log('📍 Hiding menu items:', hideElements.filter(el => el).length, 'items found');
        hideElements.forEach((el, idx) => {
            if (el) {
                el.style.display = 'none';
                console.log(`  ✅ Hidden item ${idx + 1}`);
            }
        });

        // Asigură-te că chat-ul e vizibil
        const chatLink = document.querySelector('a[href="#chat"]');
        if (chatLink) {
            const chatNavItem = chatLink.closest('.nav-item');
            if (chatNavItem) {
                chatNavItem.style.display = '';
                console.log('✅ Chat vizibil pentru GUEST');
            }
        }

        // Actualizează FOOTER-ul cu butoane de autentificare
        const sidebarFooter = document.querySelector('.sidebar-footer');
        if (sidebarFooter) {
            sidebarFooter.innerHTML = `
                <div style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                    <p style="text-align: center; color: var(--muted-foreground); margin-bottom: 0.5rem; font-size: 0.875rem;">
                        Pentru a emite facturi, autentifică-te:
                    </p>
                    <a href="login.html" class="btn btn-primary" style="width: 100%; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <i data-lucide="log-in"></i>
                        Autentificare
                    </a>
                    <a href="register.html" class="btn btn-secondary" style="width: 100%; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <i data-lucide="user-plus"></i>
                        Creează cont
                    </a>
                </div>
            `;
            lucide.createIcons();
            console.log('✅ Footer actualizat cu butoane Register/Login');
        }

        // Du-te automat pe chat DOAR dacă nu ești deja pe o pagină validă pentru guest
        const currentHash = window.location.hash;
        if (!currentHash || currentHash === '#' || currentHash === '#dashboard' || currentHash.includes('#generator') || currentHash.includes('#istoric') || currentHash === '#settings') {
            console.log('⚡ Redirect automat către #chat (hash invalid pentru guest:', currentHash, ')');
            window.location.hash = '#chat';
        } else {
            console.log('✅ Hash valid pentru guest:', currentHash);
        }
        } else {
        console.log('👤👤👤 ENTERING LOGGED MODE - Setting up UI...');

        // Afișează tot pentru utilizatori logați
        const allNavItems = document.querySelectorAll('.nav-item, .nav-item-parent');
        allNavItems.forEach((el) => {
            el.style.display = '';
        });
        console.log('✅ Toate elementele de meniu afișate pentru utilizator logat');

        // Restaurează footer-ul original cu user info pentru utilizatori logați
        const sidebarFooter = document.querySelector('.sidebar-footer');
        if (sidebarFooter) {
            sidebarFooter.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar" id="userAvatar">U</div>
                    <div class="user-details">
                        <div class="user-name" id="userName">Utilizator</div>
                        <div class="user-email" id="userEmail"></div>
                    </div>
                </div>
                <a href="#subscription" class="btn btn-primary" style="width: 100%; margin-bottom: 0.5rem; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <i data-lucide="credit-card"></i>
                    Abonament
                </a>
                <button id="logout-btn" class="btn btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <i data-lucide="log-out"></i>
                    Deconectare
                </button>
            `;
            lucide.createIcons();

            // Re-attach logout handler
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', logout);
                console.log('✅ Logout button event listener attached');
            } else {
                console.error('❌ Logout button NOT FOUND after creation!');
            }

            // Populate user info (name + email) above subscription
            try {
                fetch(`${API_URL}/api/auth/me`, { headers: getAuthHeaders() })
                  .then(r => r.ok ? r.json() : null)
                  .then(data => {
                    if (data && data.success && data.user) {
                        updateUserInfo({
                            name: data.user.name,
                            email: data.user.email
                        });
                    } else {
                        // fallback from token payload
                        loadUserData().then(u => { if (u) updateUserInfo(u); });
                    }
                  })
                  .catch(err => {
                    console.error('Eroare încărcare me:', err);
                    loadUserData().then(u => { if (u) updateUserInfo(u); });
                  });
            } catch (e) {
                console.error('Eroare afișare user info:', e);
                loadUserData().then(u => { if (u) updateUserInfo(u); });
            }

            console.log('✅ Footer restaurat pentru utilizator logat');
        }
        }
    } catch (e) {
        console.error('❌ Eroare în updateUIBasedOnAuth:', e);
    } finally {
        if (loader) loader.style.display = 'none';
        console.log('\n🏁 ========================================');
        console.log('🏁 updateUIBasedOnAuth COMPLETED');
        console.log('🏁 ========================================\n');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Helper to get authorization header
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

// ========== COMPANY SETTINGS (new UI in index.html) ==========
let companySettingsHandlersBound = false;

function populateCompanySettingsFormNew(settings) {
    const map = {
        name: 'company-name',
        cui: 'company-cui',
        regCom: 'company-regCom',
        address: 'company-address',
        city: 'company-city',
        county: 'company-county',
        postalCode: 'company-postalCode',
        phone: 'company-phone',
        email: 'company-email',
        bank: 'company-bank',
        iban: 'company-iban',
        capital: 'company-capital',
        legalRep: 'company-legalRep'
    };
    Object.entries(map).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el && settings && settings[key] !== undefined && settings[key] !== null) {
            el.value = settings[key] ?? '';
        }
    });
}

async function loadCompanySettingsNew() {
    try {
        const res = await fetch(`${API_URL}/api/settings`, { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.settings) {
                populateCompanySettingsFormNew(data.settings);
                localStorage.setItem('companySettings', JSON.stringify(data.settings));
                return;
            }
        }
    } catch (e) {
        console.error('Eroare încărcare setări (company-settings):', e);
    }
    // fallback din localStorage
    const saved = localStorage.getItem('companySettings');
    if (saved) {
        try { populateCompanySettingsFormNew(JSON.parse(saved)); } catch (e) {}
    }
}

function bindCompanySettingsHandlers() {
    if (companySettingsHandlersBound) return;
    const form = document.getElementById('company-settings-form');
    const autoBtn = document.getElementById('autocomplete-company-btn');
    const cuiInput = document.getElementById('company-cui');

    if (form && !form.dataset.listenerAdded) {
        form.dataset.listenerAdded = 'true';
        console.log('✅ Company settings form handler attached');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('[Company Settings] Form submitted');
            const fd = new FormData(form);
            const payload = Object.fromEntries(fd);
            console.log('[Company Settings] Payload:', payload);
            
            // Show loading state on submit button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                const oldHtml = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i data-lucide="loader-2"></i> Se salvează...';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            
            try {
                console.log('[Company Settings] Sending to:', `${API_URL}/api/settings`);
                const resp = await fetch(`${API_URL}/api/settings`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });
                console.log('[Company Settings] Response status:', resp.status);
                const data = await resp.json();
                console.log('[Company Settings] Response data:', data);
                
                if (resp.ok && data.success) {
                    alert('✅ Date companie salvate cu succes');
                    localStorage.setItem('companySettings', JSON.stringify(data.settings || payload));
                } else if (resp.status === 401) {
                    localStorage.setItem('companySettings', JSON.stringify(payload));
                    alert('✅ Setări salvate local (autentificați-vă pentru salvare permanentă)');
                } else {
                    alert('❌ Eroare la salvarea datelor: ' + (data.error || 'Unknown error'));
                }
            } catch (err) {
                console.error('[Company Settings] Eroare salvare:', err);
                localStorage.setItem('companySettings', JSON.stringify(Object.fromEntries(new FormData(form))));
                alert('✅ Setări salvate local (offline)');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i data-lucide="save"></i> Salvează Date';
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }
            }
        });
    } else {
        console.log('[Company Settings] Form not found or already has handler');
    }

    if (autoBtn && !autoBtn.dataset.listenerAdded) {
        autoBtn.dataset.listenerAdded = 'true';
        autoBtn.addEventListener('click', async () => {
            const cui = (cuiInput?.value || '').trim().replace(/[^0-9]/g, '');
            if (!cui) { alert('Introduceți CUI'); return; }
            autoBtn.disabled = true;
            const oldHtml = autoBtn.innerHTML;
            autoBtn.innerHTML = '<i data-lucide="loader-2"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            try {
                const resp = await fetch(`${API_URL}/api/settings/autocomplete/${cui}`, { headers: getAuthHeaders() });
                const data = await resp.json();
                if (data.success && data.settings) {
                    populateCompanySettingsFormNew(data.settings);
                    if (isLoggedIn()) {
                        localStorage.setItem('companySettings', JSON.stringify(data.settings));
                    }
                    alert('✅ Date completate automat din ANAF');
                } else {
                    alert('❌ Companie negăsită în ANAF');
                }
            } catch (err) {
                console.error('Eroare autocomplete:', err);
                alert('❌ Eroare la interogarea ANAF');
            } finally {
                autoBtn.disabled = false;
                autoBtn.innerHTML = oldHtml;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    companySettingsHandlersBound = true;
}

function initCompanySettingsPage() {
    console.log('[Company Settings] Initializing page...');
    const page = document.getElementById('company-settings');
    if (!page) {
        console.log('[Company Settings] Page element not found');
        return;
    }
    console.log('[Company Settings] Page found, binding handlers and loading data');
    
    // Force rebind to ensure handler is attached
    companySettingsHandlersBound = false;
    
    bindCompanySettingsHandlers();
    loadCompanySettingsNew();
    
    // Ensure lucide icons are rendered
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ========== INVOICE GENERATOR ==========
let invoiceProducts = [];

function initInvoiceGenerator() {
    console.log('[Invoice Generator] Initializing...');
    
    const form = document.getElementById('invoice-form');
    const addProductBtn = document.getElementById('add-product');
    const clientTypeSelect = document.getElementById('client-type');
    const autocompleteClientBtn = document.getElementById('autocomplete-client-btn');
    
    if (!form) {
        console.error('[Invoice Generator] ❌ Form not found - element with id "invoice-form" does not exist');
        return;
    }
    
    console.log('[Invoice Generator] ✅ Form found:', form);
    
    // Load company settings to auto-populate issuer data
    loadCompanySettingsForInvoice();
    
    // Add product
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            addInvoiceProduct();
        });
    }
    
    // Remove old event listener if exists
    const oldClone = form.cloneNode(true);
    form.parentNode.replaceChild(oldClone, form);
    const newForm = document.getElementById('invoice-form');
    
    // Re-attach event listeners AFTER cloning (cloning removes them!)
    // Client type toggle
    const newClientTypeSelect = document.getElementById('client-type');
    if (newClientTypeSelect) {
        newClientTypeSelect.addEventListener('change', () => {
            const type = newClientTypeSelect.value;
            const companyFields = document.getElementById('company-fields');
            const individualFields = document.getElementById('individual-fields');
            
            if (type === 'company') {
                companyFields.style.display = 'block';
                individualFields.style.display = 'none';
            } else {
                companyFields.style.display = 'none';
                individualFields.style.display = 'block';
            }
        });
    }
    
    // Autocomplete client from ANAF - re-attach to NEW button
    const newAutocompleteBtn = document.getElementById('autocomplete-client-btn');
    if (newAutocompleteBtn) {
        newAutocompleteBtn.addEventListener('click', async () => {
            const cuiInput = document.getElementById('client-cui');
            const cui = cuiInput.value.trim().replace(/^RO/i, '');
            
            if (!cui) {
                alert('Introduceți mai întâi CUI-ul');
                return;
            }
            
            newAutocompleteBtn.disabled = true;
            const oldHtml = newAutocompleteBtn.innerHTML;
            newAutocompleteBtn.innerHTML = '<i data-lucide="loader-2"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            try {
                const resp = await fetch(`${API_URL}/api/settings/autocomplete/${cui}`, { 
                    headers: getAuthHeaders() 
                });
                const data = await resp.json();
                
                if (data.success && data.settings) {
                    document.getElementById('client-name').value = data.settings.name || '';
                    document.getElementById('client-cui').value = data.settings.cui || '';
                    document.getElementById('client-regCom').value = data.settings.regCom || '';
                    document.getElementById('client-address').value = data.settings.address || '';
                    document.getElementById('client-city').value = data.settings.city || '';
                    document.getElementById('client-county').value = data.settings.county || '';
                    alert('✅ Date completate automat din ANAF');
                } else {
                    alert('❌ Nu s-au găsit informații pentru acest CUI');
                }
            } catch (err) {
                console.error('Eroare autocomplete:', err);
                alert('❌ Eroare la căutarea datelor');
            } finally {
                newAutocompleteBtn.disabled = false;
                newAutocompleteBtn.innerHTML = oldHtml;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }
    
    // Form submit - attach fresh event listener
    console.log('[Invoice Generator] Attaching NEW submit event listener to form');
    newForm.addEventListener('submit', handleInvoiceSubmit);
    console.log('[Invoice Generator] ✅ Submit event listener attached to FRESH form');
    
    // Add initial product
    if (invoiceProducts.length === 0) {
        addInvoiceProduct();
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadCompanySettingsForInvoice() {
    try {
        const resp = await fetch(`${API_URL}/api/settings`, { 
            headers: getAuthHeaders() 
        });
        
        if (resp.ok) {
            const data = await resp.json();
            if (data.success && data.settings) {
                console.log('[Invoice Generator] Company settings loaded:', data.settings);
                // Settings are loaded - invoice will use them from backend
            }
        }
    } catch (err) {
        console.error('[Invoice Generator] Error loading company settings:', err);
    }
}

function addInvoiceProduct() {
    const container = document.getElementById('products-container');
    if (!container) return;

    const index = invoiceProducts.length;
    const productDiv = document.createElement('div');
    productDiv.className = 'product-item';
    productDiv.dataset.index = index;

    // Obține setările TVA
    const vatSettings = getVATSettings();
    const defaultVAT = vatSettings.isVatPayer ? vatSettings.vatRate : 0;
    const vatFieldDisplay = vatSettings.isVatPayer ? 'block' : 'none';

    productDiv.innerHTML = `
        <div class="product-row">
            <div class="form-group">
                <label>Denumire Produs/Serviciu</label>
                <input type="text" class="product-name" required>
            </div>
            <div class="form-group">
                <label>U.M.</label>
                <input type="text" class="product-unit" value="buc" required>
            </div>
            <div class="form-group">
                <label>Cantitate</label>
                <input type="number" class="product-quantity" value="1" min="0.01" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Preț Unitar (fără TVA)</label>
                <input type="number" class="product-price" value="0" min="0" step="0.01" required>
            </div>
            <div class="form-group" style="display: ${vatFieldDisplay};">
                <label>TVA (%)</label>
                <input type="number" class="product-vat" value="${defaultVAT}" min="0" max="100" step="1" required>
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-danger btn-icon remove-product" title="Șterge produs">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `;

    container.appendChild(productDiv);

    // Add event listeners
    const inputs = productDiv.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateInvoiceTotals);
    });

    const removeBtn = productDiv.querySelector('.remove-product');
    removeBtn.addEventListener('click', () => {
        productDiv.remove();
        invoiceProducts.splice(index, 1);
        calculateInvoiceTotals();
    });

    invoiceProducts.push({});
    calculateInvoiceTotals();

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function calculateInvoiceTotals() {
    const productItems = document.querySelectorAll('#products-container .product-item');
    let subtotal = 0;
    let totalVat = 0;
    
    productItems.forEach(item => {
        const quantity = parseFloat(item.querySelector('.product-quantity').value) || 0;
        const price = parseFloat(item.querySelector('.product-price').value) || 0;
        const vatRate = parseFloat(item.querySelector('.product-vat').value) || 0;
        
        const lineSubtotal = quantity * price;
        const lineVat = lineSubtotal * (vatRate / 100);
        
        subtotal += lineSubtotal;
        totalVat += lineVat;
    });
    
    const total = subtotal + totalVat;
    
    document.getElementById('summary-subtotal').textContent = subtotal.toFixed(2) + ' RON';
    document.getElementById('summary-vat').textContent = totalVat.toFixed(2) + ' RON';
    document.getElementById('summary-total').textContent = total.toFixed(2) + ' RON';
}

async function handleInvoiceSubmit(event) {
    console.log('[Invoice Generator] 🚀 handleInvoiceSubmit CALLED');
    console.log('[Invoice Generator] Event:', event);
    console.log('[Invoice Generator] Event target:', event.target);
    
    event.preventDefault();
    event.stopPropagation();
    
    console.log('[Invoice Generator] ✅ preventDefault called');
    console.log('[Invoice Generator] Form submitted');
    
    // Collect products - Format pentru backend schema
    const items = [];
    const productItems = document.querySelectorAll('#products-container .product-item');
    
    console.log('[Invoice Generator] Found product items:', productItems.length);

    productItems.forEach((item, index) => {
        const description = item.querySelector('.product-name').value;
        const unit = item.querySelector('.product-unit').value;
        const quantity = parseFloat(item.querySelector('.product-quantity').value);
        const unitPrice = parseFloat(item.querySelector('.product-price').value);
        const vatRate = parseFloat(item.querySelector('.product-vat').value);
        
        console.log(`[Invoice Generator] Product ${index}:`, { description, unit, quantity, unitPrice, vatRate });

        if (description && quantity && unitPrice >= 0) {
            items.push({
                description,
                unit,
                quantity,
                unitPrice,
                vatRate
            });
        }
    });
    
    console.log('[Invoice Generator] Total valid items:', items.length);

    if (items.length === 0) {
        alert('Adăugați cel puțin un produs/serviciu');
        console.log('[Invoice Generator] ❌ No items - aborting');
        return;
    }

    // Collect client data - Format pentru backend schema
    const clientType = document.getElementById('client-type').value;
    const clientAddress = document.getElementById('client-address').value || '';
    const clientCity = document.getElementById('client-city').value || '';
    const clientCounty = document.getElementById('client-county').value || '';

    const clientData = {
        type: clientType,
        address: {
            street: clientAddress,
            city: clientCity,
            county: clientCounty,
            country: 'România'
        }
    };

    if (clientType === 'company') {
        clientData.name = document.getElementById('client-name').value;
        clientData.cui = document.getElementById('client-cui').value.replace(/^RO/i, '');
        clientData.registrationNumber = document.getElementById('client-regCom').value;
    } else {
        clientData.firstName = document.getElementById('client-firstName').value;
        clientData.lastName = document.getElementById('client-lastName').value;
        clientData.cnp = document.getElementById('client-cnp').value;
    }
    
    console.log('[Invoice Generator] Client data:', clientData);

    // Obține datele companiei (provider)
    const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const providerData = {
        name: companySettings.name || 'Compania Mea SRL',
        cui: (companySettings.cui || '').replace(/^RO/i, ''),
        registrationNumber: companySettings.regCom || '',
        address: {
            street: companySettings.address || '',
            city: companySettings.city || '',
            county: companySettings.county || '',
            country: 'România'
        },
        phone: companySettings.phone || '',
        email: companySettings.email || '',
        iban: companySettings.iban || '',
        bankName: companySettings.bank || ''
    };
    
    console.log('[Invoice Generator] Provider data:', providerData);

    // Generează numărul facturii
    const invoiceNumber = generateDocumentNumber('invoice');
    console.log('[Invoice Generator] Generated invoice number:', invoiceNumber);

    const invoiceData = {
        invoiceNumber: invoiceNumber,
        provider: providerData,
        client: clientData,
        products: items
    };

    console.log('[Invoice Generator] Complete invoice data:', invoiceData);

    // Show loading
    const submitBtn = event.target.querySelector('button[type="submit"]');
    console.log('[Invoice Generator] Submit button:', submitBtn);

    if (submitBtn) {
        console.log('[Invoice Generator] Disabling button and showing loading...');
        submitBtn.disabled = true;
        const oldHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i data-lucide="loader-2"></i> Se generează...';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
            console.log('[Invoice Generator] 📤 Sending request to:', `${API_URL}/api/invoices`);
            console.log('[Invoice Generator] Request headers:', getAuthHeaders());
            console.log('[Invoice Generator] Request data:', JSON.stringify(invoiceData, null, 2));

            const resp = await fetch(`${API_URL}/api/invoices/create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(invoiceData)
            });

            console.log('[Invoice Generator] 📥 Response received, status:', resp.status);
            console.log('[Invoice Generator] Response OK:', resp.ok);
            
            const data = await resp.json();
            console.log('[Invoice Generator] 📦 Response data:', data);
            
            if (resp.ok && data.success) {
                console.log('[Invoice Generator] ✅ SUCCESS!');
                alert(`✅ Factura ${data.invoice.invoiceNumber} a fost generată cu succes!`);
                
                // Reset form
                event.target.reset();
                document.getElementById('products-container').innerHTML = '';
                invoiceProducts = [];
                addInvoiceProduct();
                calculateInvoiceTotals();
                
                // Redirect to history and reload invoices
                console.log('[Invoice Generator] Redirecting to invoice history...');
                
                // Switch to invoices tab directly instead of using hash
                if (typeof switchTab === 'function') {
                    switchTab('invoices');
                } else {
                    window.location.hash = '#invoices';
                    // Reload invoices list as fallback
                    if (typeof loadInvoices === 'function') {
                        setTimeout(() => loadInvoices(), 500);
                    }
                }
            } else {
                console.log('[Invoice Generator] ❌ ERROR from server:', data);
                alert('❌ Eroare: ' + (data.message || data.error || 'Nu s-a putut genera factura'));
            }
        } catch (err) {
            console.error('[Invoice Generator] ❌❌❌ CATCH ERROR:', err);
            console.error('[Invoice Generator] Error name:', err.name);
            console.error('[Invoice Generator] Error message:', err.message);
            console.error('[Invoice Generator] Error stack:', err.stack);
            alert('❌ Eroare la generarea facturii: ' + err.message);
        } finally {
            console.log('[Invoice Generator] Finally block - re-enabling button');
            submitBtn.disabled = false;
            submitBtn.innerHTML = oldHtml;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    } else {
        console.error('[Invoice Generator] ❌ Submit button NOT FOUND!');
        console.error('[Invoice Generator] Event target:', event.target);
        console.error('[Invoice Generator] Event target HTML:', event.target.outerHTML);
        alert('❌ Eroare: Butonul de submit nu a fost găsit!');
    }

    console.log('[Invoice Generator] 🏁 handleInvoiceSubmit COMPLETED');
}

// ========== PROFORMA GENERATOR ==========
let proformaProducts = [];

function initProformaGenerator() {
    console.log('[Proforma Generator] Initializing...');
    
    const form = document.getElementById('proforma-form');
    const addProductBtn = document.getElementById('add-proforma-product');
    const clientTypeSelect = document.getElementById('proforma-client-type');
    const autocompleteClientBtn = document.getElementById('autocomplete-proforma-client-btn');
    
    if (!form) {
        console.log('[Proforma Generator] Form not found');
        return;
    }
    
    // Client type toggle
    if (clientTypeSelect) {
        clientTypeSelect.addEventListener('change', () => {
            const type = clientTypeSelect.value;
            const companyFields = document.getElementById('proforma-company-fields');
            const individualFields = document.getElementById('proforma-individual-fields');
            
            if (type === 'company') {
                companyFields.style.display = 'block';
                individualFields.style.display = 'none';
            } else {
                companyFields.style.display = 'none';
                individualFields.style.display = 'block';
            }
        });
    }
    
    // Autocomplete client from ANAF
    if (autocompleteClientBtn) {
        autocompleteClientBtn.addEventListener('click', async () => {
            const cuiInput = document.getElementById('proforma-client-cui');
            const cui = cuiInput.value.trim().replace(/^RO/i, '');
            
            if (!cui) {
                alert('Introduceți mai întâi CUI-ul');
                return;
            }
            
            autocompleteClientBtn.disabled = true;
            const oldHtml = autocompleteClientBtn.innerHTML;
            autocompleteClientBtn.innerHTML = '<i data-lucide="loader-2"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            try {
                const resp = await fetch(`${API_URL}/api/settings/autocomplete/${cui}`, { 
                    headers: getAuthHeaders() 
                });
                const data = await resp.json();
                
                if (data.success && data.settings) {
                    document.getElementById('proforma-client-name').value = data.settings.name || '';
                    document.getElementById('proforma-client-cui').value = data.settings.cui || '';
                    document.getElementById('proforma-client-regCom').value = data.settings.regCom || '';
                    document.getElementById('proforma-client-address').value = data.settings.address || '';
                    document.getElementById('proforma-client-city').value = data.settings.city || '';
                    document.getElementById('proforma-client-county').value = data.settings.county || '';
                    alert('✅ Date completate automat din ANAF');
                } else {
                    alert('❌ Nu s-au găsit informații pentru acest CUI');
                }
            } catch (err) {
                console.error('Eroare autocomplete:', err);
                alert('❌ Eroare la căutarea datelor');
            } finally {
                autocompleteClientBtn.disabled = false;
                autocompleteClientBtn.innerHTML = oldHtml;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }
    
    // Add product
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            addProformaProduct();
        });
    }
    
    // Form submit
    if (form && !form.dataset.proformaListenerAdded) {
        form.dataset.proformaListenerAdded = 'true';
        form.addEventListener('submit', handleProformaSubmit);
    }
    
    // Add initial product
    if (proformaProducts.length === 0) {
        addProformaProduct();
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addProformaProduct() {
    const container = document.getElementById('proforma-products-container');
    if (!container) return;

    const index = proformaProducts.length;
    const productDiv = document.createElement('div');
    productDiv.className = 'product-item';
    productDiv.dataset.index = index;

    // Obține setările TVA
    const vatSettings = getVATSettings();
    const defaultVAT = vatSettings.isVatPayer ? vatSettings.vatRate : 0;
    const vatFieldDisplay = vatSettings.isVatPayer ? 'block' : 'none';

    productDiv.innerHTML = `
        <div class="product-row">
            <div class="form-group">
                <label>Denumire Produs/Serviciu</label>
                <input type="text" class="proforma-product-name" required>
            </div>
            <div class="form-group">
                <label>U.M.</label>
                <input type="text" class="proforma-product-unit" value="buc" required>
            </div>
            <div class="form-group">
                <label>Cantitate</label>
                <input type="number" class="proforma-product-quantity" value="1" min="0.01" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Preț Unitar (fără TVA)</label>
                <input type="number" class="proforma-product-price" value="0" min="0" step="0.01" required>
            </div>
            <div class="form-group" style="display: ${vatFieldDisplay};">
                <label>TVA (%)</label>
                <input type="number" class="proforma-product-vat" value="${defaultVAT}" min="0" max="100" step="1" required>
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-danger btn-icon remove-proforma-product" title="Șterge produs">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(productDiv);
    
    const inputs = productDiv.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateProformaTotals);
    });
    
    const removeBtn = productDiv.querySelector('.remove-proforma-product');
    removeBtn.addEventListener('click', () => {
        productDiv.remove();
        proformaProducts.splice(index, 1);
        calculateProformaTotals();
    });
    
    proformaProducts.push({});
    calculateProformaTotals();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function calculateProformaTotals() {
    const productItems = document.querySelectorAll('#proforma-products-container .product-item');
    let subtotal = 0;
    let totalVat = 0;
    
    productItems.forEach(item => {
        const quantity = parseFloat(item.querySelector('.proforma-product-quantity').value) || 0;
        const price = parseFloat(item.querySelector('.proforma-product-price').value) || 0;
        const vatRate = parseFloat(item.querySelector('.proforma-product-vat').value) || 0;
        
        const lineSubtotal = quantity * price;
        const lineVat = lineSubtotal * (vatRate / 100);
        
        subtotal += lineSubtotal;
        totalVat += lineVat;
    });
    
    const total = subtotal + totalVat;
    
    document.getElementById('proforma-summary-subtotal').textContent = subtotal.toFixed(2) + ' RON';
    document.getElementById('proforma-summary-vat').textContent = totalVat.toFixed(2) + ' RON';
    document.getElementById('proforma-summary-total').textContent = total.toFixed(2) + ' RON';
}

async function handleProformaSubmit(event) {
    event.preventDefault();
    console.log('[Proforma Generator] Form submitted');
    
    const products = [];
    const productItems = document.querySelectorAll('#proforma-products-container .product-item');
    
    productItems.forEach(item => {
        const name = item.querySelector('.proforma-product-name').value;
        const unit = item.querySelector('.proforma-product-unit').value;
        const quantity = parseFloat(item.querySelector('.proforma-product-quantity').value);
        const price = parseFloat(item.querySelector('.proforma-product-price').value);
        const vat = parseFloat(item.querySelector('.proforma-product-vat').value);
        
        if (name && quantity && price >= 0) {
            products.push({ name, unit, quantity, price, vat });
        }
    });
    
    if (products.length === 0) {
        alert('Adăugați cel puțin un produs/serviciu');
        return;
    }
    
    const clientType = document.getElementById('proforma-client-type').value;
    const clientData = { type: clientType };
    
    if (clientType === 'company') {
        clientData.name = document.getElementById('proforma-client-name').value;
        clientData.cui = document.getElementById('proforma-client-cui').value.replace(/^RO/i, '');
        clientData.regCom = document.getElementById('proforma-client-regCom').value;
        clientData.address = document.getElementById('proforma-client-address').value;
        clientData.city = document.getElementById('proforma-client-city').value;
        clientData.county = document.getElementById('proforma-client-county').value;
    } else {
        clientData.firstName = document.getElementById('proforma-client-firstName').value;
        clientData.lastName = document.getElementById('proforma-client-lastName').value;
        clientData.cnp = document.getElementById('proforma-client-cnp').value;
        clientData.address = document.getElementById('proforma-client-address').value;
        clientData.city = document.getElementById('proforma-client-city').value;
        clientData.county = document.getElementById('proforma-client-county').value;
    }
    
    // Generează numărul proformei
    const proformaNumber = generateDocumentNumber('proforma');

    const proformaData = {
        proformaNumber: proformaNumber,
        client: clientData,
        products: products
    };

    console.log('[Proforma Generator] Proforma data:', proformaData);

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        const oldHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i data-lucide="loader-2"></i> Generare...';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        try {
            const resp = await fetch(`${API_URL}/api/proformas`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(proformaData)
            });
            
            const data = await resp.json();
            console.log('[Proforma Generator] Response:', data);
            
            if (resp.ok && data.success) {
                alert(`✅ Proforma ${data.proforma.proformaNumber} a fost generată cu succes!`);
                
                event.target.reset();
                document.getElementById('proforma-products-container').innerHTML = '';
                proformaProducts = [];
                addProformaProduct();
                calculateProformaTotals();
                
                window.location.hash = '#proformas';
            } else {
                alert('❌ Eroare: ' + (data.message || 'Nu s-a putut genera proforma'));
            }
        } catch (err) {
            console.error('[Proforma Generator] Error:', err);
            alert('❌ Eroare la generarea proformei');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = oldHtml;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

function previewProforma() {
    alert('🔍 Funcționalitatea de preview va fi disponibilă în curând!');
}

// ========== OFFER GENERATOR ==========
let offerProducts = [];

function initOfferGenerator() {
    console.log('[Offer Generator] Initializing...');
    
    const form = document.getElementById('offer-form');
    const addProductBtn = document.getElementById('add-offer-product');
    const clientTypeSelect = document.getElementById('offer-client-type');
    const autocompleteClientBtn = document.getElementById('autocomplete-offer-client-btn');
    
    if (!form) {
        console.log('[Offer Generator] Form not found');
        return;
    }
    
    // Client type toggle
    if (clientTypeSelect) {
        clientTypeSelect.addEventListener('change', () => {
            const type = clientTypeSelect.value;
            const companyFields = document.getElementById('offer-company-fields');
            const individualFields = document.getElementById('offer-individual-fields');
            
            if (type === 'company') {
                companyFields.style.display = 'block';
                individualFields.style.display = 'none';
            } else {
                companyFields.style.display = 'none';
                individualFields.style.display = 'block';
            }
        });
    }
    
    // Autocomplete client from ANAF
    if (autocompleteClientBtn) {
        autocompleteClientBtn.addEventListener('click', async () => {
            const cuiInput = document.getElementById('offer-client-cui');
            const cui = cuiInput.value.trim().replace(/^RO/i, '');
            
            if (!cui) {
                alert('Introduceți mai întâi CUI-ul');
                return;
            }
            
            autocompleteClientBtn.disabled = true;
            const oldHtml = autocompleteClientBtn.innerHTML;
            autocompleteClientBtn.innerHTML = '<i data-lucide="loader-2"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            try {
                const resp = await fetch(`${API_URL}/api/settings/autocomplete/${cui}`, { 
                    headers: getAuthHeaders() 
                });
                const data = await resp.json();
                
                if (data.success && data.settings) {
                    document.getElementById('offer-client-name').value = data.settings.name || '';
                    document.getElementById('offer-client-cui').value = data.settings.cui || '';
                    alert('✅ Date completate automat din ANAF');
                } else {
                    alert('❌ Nu s-au găsit informații pentru acest CUI');
                }
            } catch (err) {
                console.error('Eroare autocomplete:', err);
                alert('❌ Eroare la căutarea datelor');
            } finally {
                autocompleteClientBtn.disabled = false;
                autocompleteClientBtn.innerHTML = oldHtml;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }
    
    // Add product
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            addOfferProduct();
        });
    }
    
    // Form submit
    if (form && !form.dataset.offerListenerAdded) {
        form.dataset.offerListenerAdded = 'true';
        form.addEventListener('submit', handleOfferSubmit);
    }
    
    // Add initial product
    if (offerProducts.length === 0) {
        addOfferProduct();
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addOfferProduct() {
    const container = document.getElementById('offer-products-container');
    if (!container) return;

    const index = offerProducts.length;
    const productDiv = document.createElement('div');
    productDiv.className = 'product-item';
    productDiv.dataset.index = index;

    // Obține setările TVA
    const vatSettings = getVATSettings();
    const defaultVAT = vatSettings.isVatPayer ? vatSettings.vatRate : 0;
    const vatFieldDisplay = vatSettings.isVatPayer ? 'block' : 'none';

    productDiv.innerHTML = `
        <div class="product-row">
            <div class="form-group">
                <label>Denumire Produs/Serviciu</label>
                <input type="text" class="offer-product-name" required>
            </div>
            <div class="form-group">
                <label>Cantitate</label>
                <input type="number" class="offer-product-quantity" value="1" min="0.01" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Preț Unitar (fără TVA)</label>
                <input type="number" class="offer-product-price" value="0" min="0" step="0.01" required>
            </div>
            <div class="form-group" style="display: ${vatFieldDisplay};">
                <label>TVA (%)</label>
                <input type="number" class="offer-product-vat" value="${defaultVAT}" min="0" max="100" step="1" required>
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-danger btn-icon remove-offer-product" title="Șterge produs">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(productDiv);
    
    const inputs = productDiv.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateOfferTotals);
    });
    
    const removeBtn = productDiv.querySelector('.remove-offer-product');
    removeBtn.addEventListener('click', () => {
        productDiv.remove();
        offerProducts.splice(index, 1);
        calculateOfferTotals();
    });
    
    offerProducts.push({});
    calculateOfferTotals();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function calculateOfferTotals() {
    const productItems = document.querySelectorAll('#offer-products-container .product-item');
    let subtotal = 0;
    let totalVat = 0;
    
    productItems.forEach(item => {
        const quantity = parseFloat(item.querySelector('.offer-product-quantity').value) || 0;
        const price = parseFloat(item.querySelector('.offer-product-price').value) || 0;
        const vatRate = parseFloat(item.querySelector('.offer-product-vat').value) || 0;
        
        const lineSubtotal = quantity * price;
        const lineVat = lineSubtotal * (vatRate / 100);
        
        subtotal += lineSubtotal;
        totalVat += lineVat;
    });
    
    const total = subtotal + totalVat;
    
    const subtotalEl = document.getElementById('offer-summary-subtotal');
    const vatEl = document.getElementById('offer-summary-vat');
    const totalEl = document.getElementById('offer-summary-total');
    
    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2) + ' RON';
    if (vatEl) vatEl.textContent = totalVat.toFixed(2) + ' RON';
    if (totalEl) totalEl.textContent = total.toFixed(2) + ' RON';
}

async function handleOfferSubmit(event) {
    event.preventDefault();
    console.log('[Offer Generator] Form submitted');
    
    const products = [];
    const productItems = document.querySelectorAll('#offer-products-container .product-item');
    
    productItems.forEach(item => {
        const name = item.querySelector('.offer-product-name').value;
        const quantity = parseFloat(item.querySelector('.offer-product-quantity').value);
        const price = parseFloat(item.querySelector('.offer-product-price').value);
        const vatRate = parseFloat(item.querySelector('.offer-product-vat').value);
        
        if (name && quantity && price >= 0) {
            products.push({ name, quantity, price, vatRate });
        }
    });
    
    if (products.length === 0) {
        alert('Adăugați cel puțin un produs/serviciu');
        return;
    }
    
    const formData = new FormData(event.target);
    const clientType = formData.get('offer-client-type');

    // Generează numărul ofertei
    const quoteNumber = generateDocumentNumber('quote');

    const offerData = {
        quoteNumber: quoteNumber,
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

    console.log('[Offer Generator] Offer data:', offerData);

    alert(`✅ Oferta ${quoteNumber} a fost generată cu succes!\n\nÎn producție, aceasta va fi salvată în baza de date și va putea fi descărcată ca PDF.`);
    
    event.target.reset();
    document.getElementById('offer-products-container').innerHTML = '';
    offerProducts = [];
    addOfferProduct();
    calculateOfferTotals();
}

function previewOffer() {
    alert('🔍 Funcționalitatea de preview va fi disponibilă în curând!');
}

// ========== GLOBAL INITIALIZATION ==========
// Re-initialize when hash changes
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#invoices') {
        switchTab('invoices');
    }
    if (window.location.hash === '#invoice-generator') {
        initInvoiceGenerator();
    }
    if (window.location.hash === '#proforma-generator') {
        initProformaGenerator();
    }
    if (window.location.hash === '#offer-generator') {
        initOfferGenerator();
    }
    if (window.location.hash === '#company-settings') {
        initCompanySettingsPage();
    }
    if (window.location.hash === '#vat-settings') {
        initVATSettingsPage();
    }
    if (window.location.hash === '#numbering-settings') {
        initNumberingSettingsPage();
    }
    if (window.location.hash === '#whatsapp-settings') {
        initWhatsAppSettingsPage();
    }
});

// ========== GLOBAL APP INITIALIZATION ==========
async function initializeApp() {
    console.log('🚀 Initializing ChatBill app...');
    // Immediately hide auth loader to prevent UI blocking
    try {
        const loaderImmediate = document.getElementById('auth-loader');
        if (loaderImmediate) loaderImmediate.style.display = 'none';
    } catch (e) {}
    // Fail-safe: hide auth loader after 5s even if something breaks
    try {
        const loader = document.getElementById('auth-loader');
        if (loader) {
            setTimeout(() => {
                loader.style.display = 'none';
                console.log('⏱️ Failsafe: auth loader hidden after timeout');
            }, 5000);
        }
    } catch (e) {}
    
    // Call auth UI update - this is CRITICAL
    if (typeof updateUIBasedOnAuth === 'function') {
        await updateUIBasedOnAuth();
    } else {
        console.error('❌ updateUIBasedOnAuth function not found!');
        // Hide loader even if function missing
        const loader = document.getElementById('auth-loader');
        if (loader) loader.style.display = 'none';
    }
    
    // Initialize page-specific handlers based on current hash
    const currentHash = window.location.hash;

    if (currentHash === '#company-settings') {
        initCompanySettingsPage();
    }

    if (currentHash === '#invoice-generator') {
        initInvoiceGenerator();
    }

    if (currentHash === '#proforma-generator') {
        initProformaGenerator();
    }

    if (currentHash === '#offer-generator') {
        initOfferGenerator();
    }

    if (currentHash === '#vat-settings') {
        initVATSettingsPage();
    }

    if (currentHash === '#numbering-settings') {
        initNumberingSettingsPage();
    }

    if (currentHash === '#whatsapp-settings') {
        initWhatsAppSettingsPage();
    }
    
    console.log('✅ ChatBill app initialized');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}


window.addEventListener('hashchange', () => {
    if (window.location.hash === '#company-settings') {
        initCompanySettingsPage();
    }
    if (window.location.hash === '#whatsapp-settings') {
        initWhatsAppSettingsPage();
    }
});

// ========== WHATSAPP SETTINGS PAGE ==========
let whatsappHandlersBound = false;

async function initWhatsAppSettingsPage() {
    const page = document.getElementById('whatsapp-settings');
    if (!page) return;

    // Load user's current WhatsApp number
    if (isLoggedIn()) {
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.user) {
                    const phoneInput = document.getElementById('whatsapp-phone');
                    const savedSection = document.getElementById('whatsapp-saved-section');
                    const savedNumber = document.getElementById('whatsapp-saved-number');

                    if (phoneInput && data.user.phone) {
                        phoneInput.value = data.user.phone;
                    }

                    if (data.user.phone) {
                        // Show saved state
                        if (savedSection) {
                            savedSection.style.display = 'block';
                            if (savedNumber) {
                                savedNumber.textContent = data.user.phone;
                            }
                        }
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }
                }
            }
        } catch (e) {
            console.error('Eroare verificare status WhatsApp:', e);
        }
    }

    bindWhatsAppHandlers();
}

function bindWhatsAppHandlers() {
    if (whatsappHandlersBound) return;

    const saveBtn = document.getElementById('save-whatsapp-phone-btn');
    const phoneInput = document.getElementById('whatsapp-phone');

    if (saveBtn && !saveBtn.dataset.listenerAdded) {
        saveBtn.dataset.listenerAdded = 'true';
        saveBtn.addEventListener('click', async () => {
            const phone = phoneInput?.value?.trim();
            if (!phone) {
                alert('Introduceți numărul de telefon WhatsApp');
                return;
            }

            saveBtn.disabled = true;
            const oldHtml = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i data-lucide="loader-2"></i> Salvare...';
            if (typeof lucide !== 'undefined') lucide.createIcons();

            try {
                // Save phone directly without verification
                const saveRes = await fetch(`${API_URL}/api/settings`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ phone })
                });

                const data = await saveRes.json();
                if (data.success) {
                    alert('✅ Număr WhatsApp salvat cu succes! Acum puteți trimite mesaje de pe acest număr și vă vom recunoaște automat.');
                    
                    // Show saved section
                    const savedSection = document.getElementById('whatsapp-saved-section');
                    const savedNumber = document.getElementById('whatsapp-saved-number');
                    
                    if (savedSection) {
                        savedSection.style.display = 'block';
                        if (savedNumber) {
                            savedNumber.textContent = phone;
                        }
                    }
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                } else {
                    alert('❌ ' + (data.error || 'Eroare la salvarea numărului'));
                }
            } catch (err) {
                console.error('Eroare salvare număr WhatsApp:', err);
                alert('❌ Eroare la salvarea numărului');
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = oldHtml;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    whatsappHandlersBound = true;
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
function switchTab(tabName, event) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected page (without 'Tab' suffix - ID is just the tabName)
    const targetPage = document.getElementById(tabName);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        console.error(`❌ Page with ID "${tabName}" not found!`);
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // If no event, find and activate the tab button
        const tabButton = document.querySelector(`[onclick*="switchTab('${tabName}')"]`);
        if (tabButton) {
            tabButton.classList.add('active');
        }
    }
    
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
    console.log('🔵 loadInvoices called');
    const invoicesList = document.getElementById('invoicesList');
    if (!invoicesList) {
        console.error('❌ Element #invoicesList not found!');
        return;
    }
    console.log('✅ Found invoicesList element');
    invoicesList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Se încarcă facturile...</p>';
    
    try {
        console.log('📤 Fetching invoices from:', `${API_URL}/api/invoices`);
        const response = await fetch(`${API_URL}/api/invoices`, {
            headers: getAuthHeaders()
        });
        console.log('📥 Response status:', response.status);
        const data = await response.json();
        console.log('📦 Response data:', data);
        console.log('📊 data.success:', data.success);
        console.log('📊 data.data:', data.data);
        console.log('📊 data.invoices:', data.invoices);
        
        // Backend returnează datele în data.data (paginare) sau data.invoices (legacy)
        const invoices = data.data || data.invoices || [];
        console.log('📊 invoices array:', invoices);
        console.log('📊 invoices.length:', invoices.length);
        
        if (data.success && invoices.length > 0) {
            console.log('✅ Displaying', invoices.length, 'invoices');
            displayInvoicesTable(invoices);
        } else {
            console.log('⚠️ No invoices to display');
            invoicesList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">📋 Nu există facturi generate încă.</p>';
        }
    } catch (error) {
        console.error('❌ Eroare încărcare facturi:', error);
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
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Display user message
    displayChatMessage('user', message);
    input.value = '';
    
    // Start AI chat session if needed (pentru facturare)
    if (!currentChatSessionId) {
        try {
            const response = await fetch(`${API_URL}/api/ai-chat/start`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ source: 'web' })
            });
            
            const data = await response.json();
            if (data.success && data.sessionId) {
                currentChatSessionId = data.sessionId;
            }
        } catch (error) {
            console.error('Eroare start sesiune AI:', error);
        }
    }
    
    // Show typing indicator
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
        // Get current user info if logged in
        let userData = null;
        if (isLoggedIn()) {
            try {
                const userRes = await fetch(`${API_URL}/api/auth/me`, { headers: getAuthHeaders() });
                if (userRes.ok) {
                    const userInfo = await userRes.json();
                    if (userInfo.success && userInfo.user) {
                        userData = {
                            id: userInfo.user.id,
                            name: userInfo.user.name,
                            email: userInfo.user.email,
                            company: userInfo.user.company,
                            cui: userInfo.user.cui,
                            hasAccount: true
                        };
                    }
                }
            } catch (e) {
                console.error('Eroare obținere info user:', e);
            }
        }

        const requestBody = {
            sessionId: currentChatSessionId,
            message: message,
            source: 'web'
        };

        // Add user info if available
        if (userData) {
            requestBody.user = userData;
        } else {
            requestBody.user = { hasAccount: false };
        }

        const response = await fetch(`${API_URL}/api/ai-chat/message`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestBody)
        });
        
        // Remove typing indicator
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
        
        const data = await response.json();
        
        if (data.success) {
            displayChatMessage('assistant', data.message);
            
            // If invoice generated, show download link
            if (data.invoice) {
                const downloadMsg = `\n\n<a href="${API_URL}/api/invoices/${data.invoice.id}/download" target="_blank" style="color: #667eea; text-decoration: underline;">📥 Descarcă factura PDF</a>`;
                displayChatMessage('assistant', downloadMsg);
            }
        } else {
            displayChatMessage('assistant', '❌ ' + (data.error || 'A apărut o eroare. Te rog încearcă din nou.'));
        }
    } catch (error) {
        console.error('Eroare trimitere mesaj:', error);
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
        displayChatMessage('assistant', '❌ A apărut o eroare. Te rog încearcă din nou.');
    }
}

function displayChatMessage(role, message) {
    const messagesContainer = document.getElementById('chat-messages');
    
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
// ========== VAT SETTINGS MANAGEMENT ==========
// Funcții pentru gestionarea setărilor TVA și sincronizare cu generatoarele

function getVATSettings() {
    // Încearcă să obții setările din localStorage
    const settings = localStorage.getItem('vatSettings');
    if (settings) {
        try {
            return JSON.parse(settings);
        } catch (e) {
            console.error('Eroare parsare VAT settings:', e);
        }
    }
    
    // Default: plătitor TVA cu 21%
    return {
        isVatPayer: true,
        vatRate: 21
    };
}

function saveVATSettings(isVatPayer, vatRate) {
    const settings = {
        isVatPayer: isVatPayer,
        vatRate: parseFloat(vatRate) || 21
    };
    localStorage.setItem('vatSettings', JSON.stringify(settings));
    console.log('✅ VAT Settings salvate:', settings);
    return settings;
}

// Inițializare pagină VAT Settings
function initVATSettingsPage() {
    console.log('[VAT Settings] Initializing...');
    
    const form = document.getElementById('vat-settings-form');
    const isVatPayerCheckbox = document.getElementById('is-vat-payer-2');
    const vatRateInput = document.getElementById('vat-rate-2');
    const vatRateGroup = document.getElementById('vat-rate-group-2');
    
    if (!form) {
        console.log('[VAT Settings] Form not found');
        return;
    }
    
    // Încarcă setările salvate
    const settings = getVATSettings();
    if (isVatPayerCheckbox) {
        isVatPayerCheckbox.checked = settings.isVatPayer;
    }
    if (vatRateInput) {
        vatRateInput.value = settings.vatRate;
    }
    
    // Toggle vizibilitate câmp VAT rate
    function toggleVATRateField() {
        if (vatRateGroup) {
            vatRateGroup.style.display = isVatPayerCheckbox.checked ? 'block' : 'none';
        }
    }
    
    // Event listener pentru checkbox
    if (isVatPayerCheckbox && !isVatPayerCheckbox.dataset.listenerAdded) {
        isVatPayerCheckbox.dataset.listenerAdded = 'true';
        isVatPayerCheckbox.addEventListener('change', () => {
            toggleVATRateField();
            // Auto-save când se schimbă
            const vatRate = vatRateInput ? vatRateInput.value : 21;
            saveVATSettings(isVatPayerCheckbox.checked, vatRate);
        });
    }
    
    // Event listener pentru VAT rate input
    if (vatRateInput && !vatRateInput.dataset.listenerAdded) {
        vatRateInput.dataset.listenerAdded = 'true';
        vatRateInput.addEventListener('change', () => {
            const isVatPayer = isVatPayerCheckbox ? isVatPayerCheckbox.checked : true;
            saveVATSettings(isVatPayer, vatRateInput.value);
        });
    }
    
    // Setează vizibilitatea inițială
    toggleVATRateField();
    
    console.log('[VAT Settings] Initialized with settings:', settings);
}

// Aplică setările TVA în generatoarele de documente
function applyVATSettingsToGenerator(containerSelector, productClass) {
    const settings = getVATSettings();
    
    if (!settings.isVatPayer) {
        // Ascunde toate câmpurile TVA
        const vatFields = document.querySelectorAll(`${containerSelector} .form-group:has(.${productClass}-vat)`);
        vatFields.forEach(field => {
            field.style.display = 'none';
        });
        
        // Setează TVA la 0 pentru toate produsele
        const vatInputs = document.querySelectorAll(`${containerSelector} .${productClass}-vat`);
        vatInputs.forEach(input => {
            input.value = 0;
        });
    } else {
        // Afișează câmpurile TVA
        const vatFields = document.querySelectorAll(`${containerSelector} .form-group:has(.${productClass}-vat)`);
        vatFields.forEach(field => {
            field.style.display = 'block';
        });
        
        // Setează rata TVA default
        const vatInputs = document.querySelectorAll(`${containerSelector} .${productClass}-vat`);
        vatInputs.forEach(input => {
            if (!input.value || input.value == 0 || input.value == 19) {
                input.value = settings.vatRate;
            }
        });
    }
}


// ========== NUMBERING SETTINGS MANAGEMENT ==========
// Funcții pentru gestionarea setărilor de numerotare și generare numere documente

function getNumberingSettings() {
    // Încearcă să obții setările din localStorage
    const settings = localStorage.getItem('numberingSettings');
    if (settings) {
        try {
            return JSON.parse(settings);
        } catch (e) {
            console.error('Eroare parsare Numbering settings:', e);
        }
    }

    // Default settings
    return {
        invoice: { series: 'FAC', currentNumber: 1 },
        proforma: { series: 'PRO', currentNumber: 1 },
        quote: { series: 'OFF', currentNumber: 1 }
    };
}

function saveNumberingSettings(settings) {
    localStorage.setItem('numberingSettings', JSON.stringify(settings));
    console.log('✅ Numbering Settings salvate:', settings);
    return settings;
}

function generateDocumentNumber(type) {
    const settings = getNumberingSettings();
    const typeSettings = settings[type];

    if (!typeSettings) {
        console.error('❌ Tip document invalid:', type);
        return 'ERROR000001';
    }

    // Generează numărul formatat: SERIE + număr cu leading zeros (6 cifre)
    const series = typeSettings.series || 'DOC';
    const number = typeSettings.currentNumber || 1;
    const paddedNumber = number.toString().padStart(6, '0');
    const documentNumber = `${series}${paddedNumber}`;

    // Incrementează numărul curent pentru următorul document
    settings[type].currentNumber = number + 1;
    saveNumberingSettings(settings);

    console.log(`✅ Generat număr ${type}:`, documentNumber);
    return documentNumber;
}

function resetDocumentNumber(type, newNumber = 1) {
    const settings = getNumberingSettings();
    if (settings[type]) {
        settings[type].currentNumber = newNumber;
        saveNumberingSettings(settings);
        console.log(`✅ Reset număr ${type} la:`, newNumber);
    }
}

function updateDocumentSeries(type, newSeries) {
    const settings = getNumberingSettings();
    if (settings[type]) {
        settings[type].series = newSeries.toUpperCase();
        saveNumberingSettings(settings);
        console.log(`✅ Actualizat serie ${type} la:`, newSeries);
    }
}

// Inițializare pagină Numbering Settings
function initNumberingSettingsPage() {
    console.log('[Numbering Settings] Initializing...');

    const form = document.getElementById('numbering-settings-form');
    if (!form) {
        console.log('[Numbering Settings] Form not found');
        return;
    }

    // Încarcă setările salvate
    const settings = getNumberingSettings();

    // Populează formul
    const invoiceSeriesInput = document.getElementById('invoiceSeries');
    const invoiceStartNumberInput = document.getElementById('invoiceStartNumber');
    const proformaSeriesInput = document.getElementById('proformaSeries');
    const proformaStartNumberInput = document.getElementById('proformaStartNumber');
    const quoteSeriesInput = document.getElementById('quoteSeries');
    const quoteStartNumberInput = document.getElementById('quoteStartNumber');

    if (invoiceSeriesInput) invoiceSeriesInput.value = settings.invoice.series;
    if (invoiceStartNumberInput) invoiceStartNumberInput.value = settings.invoice.currentNumber;
    if (proformaSeriesInput) proformaSeriesInput.value = settings.proforma.series;
    if (proformaStartNumberInput) proformaStartNumberInput.value = settings.proforma.currentNumber;
    if (quoteSeriesInput) quoteSeriesInput.value = settings.quote.series;
    if (quoteStartNumberInput) quoteStartNumberInput.value = settings.quote.currentNumber;

    // Update preview
    function updatePreviews() {
        const invoicePreview = document.getElementById('invoice-preview');
        const proformaPreview = document.getElementById('proforma-preview');
        const quotePreview = document.getElementById('quote-preview');

        if (invoicePreview && invoiceSeriesInput && invoiceStartNumberInput) {
            const num = (invoiceStartNumberInput.value || 1).toString().padStart(6, '0');
            invoicePreview.textContent = `${invoiceSeriesInput.value || 'FAC'}${num}`;
        }

        if (proformaPreview && proformaSeriesInput && proformaStartNumberInput) {
            const num = (proformaStartNumberInput.value || 1).toString().padStart(6, '0');
            proformaPreview.textContent = `${proformaSeriesInput.value || 'PRO'}${num}`;
        }

        if (quotePreview && quoteSeriesInput && quoteStartNumberInput) {
            const num = (quoteStartNumberInput.value || 1).toString().padStart(6, '0');
            quotePreview.textContent = `${quoteSeriesInput.value || 'OFF'}${num}`;
        }
    }

    // Event listeners pentru preview live
    [invoiceSeriesInput, invoiceStartNumberInput, proformaSeriesInput,
     proformaStartNumberInput, quoteSeriesInput, quoteStartNumberInput].forEach(input => {
        if (input && !input.dataset.listenerAdded) {
            input.dataset.listenerAdded = 'true';
            input.addEventListener('input', () => {
                updatePreviews();
                // Auto-save
                const newSettings = {
                    invoice: {
                        series: (invoiceSeriesInput && invoiceSeriesInput.value || 'FAC').toUpperCase(),
                        currentNumber: parseInt(invoiceStartNumberInput && invoiceStartNumberInput.value || 1)
                    },
                    proforma: {
                        series: (proformaSeriesInput && proformaSeriesInput.value || 'PRO').toUpperCase(),
                        currentNumber: parseInt(proformaStartNumberInput && proformaStartNumberInput.value || 1)
                    },
                    quote: {
                        series: (quoteSeriesInput && quoteSeriesInput.value || 'OFF').toUpperCase(),
                        currentNumber: parseInt(quoteStartNumberInput && quoteStartNumberInput.value || 1)
                    }
                };
                saveNumberingSettings(newSettings);
            });
        }
    });

    // Update preview inițial
    updatePreviews();

    console.log('[Numbering Settings] Initialized with settings:', settings);
}

// ========== INVOICE PREVIEW & PDF ==========
// Funcții pentru preview și generare PDF facturi

async function previewInvoice() {
    console.log('[Invoice Preview] Starting...');

    // Colectează datele din formular (similar cu handleInvoiceSubmit)
    const products = [];
    const productItems = document.querySelectorAll('#products-container .product-item');

    productItems.forEach(item => {
        const name = item.querySelector('.product-name').value;
        const unit = item.querySelector('.product-unit').value;
        const quantity = parseFloat(item.querySelector('.product-quantity').value);
        const price = parseFloat(item.querySelector('.product-price').value);
        const vat = parseFloat(item.querySelector('.product-vat').value);

        if (name && quantity && price >= 0) {
            products.push({ name, unit, quantity, price, vat });
        }
    });

    if (products.length === 0) {
        alert('Adăugați cel puțin un produs/serviciu pentru a vedea preview-ul');
        return;
    }

    // Colectează date client
    const clientType = document.getElementById('client-type').value;
    const clientData = { type: clientType };

    if (clientType === 'company') {
        clientData.name = document.getElementById('client-name').value;
        clientData.cui = document.getElementById('client-cui').value.replace(/^RO/i, '');
        clientData.regCom = document.getElementById('client-regCom').value;
        clientData.address = document.getElementById('client-address').value;
        clientData.city = document.getElementById('client-city').value;
        clientData.county = document.getElementById('client-county').value;
    } else {
        clientData.firstName = document.getElementById('client-firstName').value;
        clientData.lastName = document.getElementById('client-lastName').value;
        clientData.cnp = document.getElementById('client-cnp').value;
        clientData.address = document.getElementById('client-address').value;
        clientData.city = document.getElementById('client-city').value;
        clientData.county = document.getElementById('client-county').value;
    }

    // Obține setările companiei și TVA
    const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const vatSettings = getVATSettings();
    const numberingSettings = getNumberingSettings();

    // Generează număr preview
    const previewNumber = numberingSettings.invoice.series + numberingSettings.invoice.currentNumber.toString().padStart(6, '0');

    // Pregătește datele pentru preview
    const invoiceData = {
        invoice: {
            invoiceNumber: previewNumber,
            issueDate: new Date().toLocaleDateString('ro-RO'),
            status: 'unpaid'
        },
        company: {
            name: companySettings.name || 'Compania Mea',
            cui: companySettings.cui || '',
            regCom: companySettings.regCom || '',
            address: companySettings.address || '',
            city: companySettings.city || '',
            county: companySettings.county || '',
            phone: companySettings.phone || '',
            email: companySettings.email || '',
            iban: companySettings.iban || '',
            bank: companySettings.bank || '',
            isVatPayer: vatSettings.isVatPayer,
            vatRate: vatSettings.vatRate
        },
        client: clientData,
        products: products,
        template: 'modern-minimal' // sau 'professional-clean'
    };

    try {
        const response = await fetch(API_URL + '/api/invoices/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invoiceData)
        });

        if (!response.ok) {
            throw new Error('Eroare la generarea preview-ului');
        }

        const html = await response.text();

        // Deschide preview în fereastră nouă
        const previewWindow = window.open('', '_blank', 'width=1000,height=800');
        previewWindow.document.write(html);
        previewWindow.document.close();

        console.log('[Invoice Preview] Preview opened successfully');
    } catch (error) {
        console.error('[Invoice Preview] Error:', error);
        alert('Eroare la generarea preview-ului: ' + error.message);
    }
}

async function downloadInvoicePDF() {
    console.log('[Invoice PDF] Starting download...');
    alert('Funcționalitatea de download PDF va fi disponibilă în curând!');
}
