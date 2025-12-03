# Integrare ANAF e-Factura

## 📋 Overview

Acest sistem implementează integrarea completă cu ANAF e-Factura folosind OAuth2 pentru autentificare și API-ul oficial pentru trimiterea facturilor.

## 🔑 Configurare Inițială

### 1. Înregistrare Aplicație la ANAF

Pentru a utiliza integrarea, trebuie să îți înregistrezi aplicația la ANAF SPV:

1. Accesează https://www.anaf.ro
2. Navighează la secțiunea SPV (Spațiul Privat Virtual)
3. Înregistrează o nouă aplicație OAuth2
4. Vei primi:
   - `client_id`
   - `client_secret`

### 2. Configurare Variabile de Mediu

Adaugă în fișierul `.env`:

```env
# ANAF e-Factura OAuth2
ANAF_CLIENT_ID=your_client_id_here
ANAF_CLIENT_SECRET=your_client_secret_here
ANAF_REDIRECT_URI=http://localhost:3000/api/anaf/callback

# Session Secret (pentru OAuth state)
SESSION_SECRET=change-this-to-random-string-in-production
```

**⚠️ IMPORTANT**: În producție:
- Schimbă `SESSION_SECRET` cu o cheie aleatoare sigură
- Actualizează `ANAF_REDIRECT_URI` cu domeniul tău real
- Înregistrează redirect URI-ul corect la ANAF

### 3. Structură Bază de Date

Migrarea `20251203200251_add_anaf_efactura` creează următoarele tabele:

#### `AnafAuth`
Stochează token-urile OAuth2 pentru fiecare user:
- `accessToken` - Token de acces pentru API ANAF
- `refreshToken` - Token pentru reîmprospătare
- `expiresAt` - Data de expirare token
- `cui` - CUI companie asociată
- `isActive` - Status conexiune

#### `AnafAppConfig`
Configurare aplicație ANAF (credențiale, URL-uri):
- `clientId` - Client ID de la ANAF
- `clientSecret` - Secret pentru OAuth
- `redirectUri` - URL callback
- `environment` - test/production

#### `EFacturaLog`
Log-uri pentru fiecare factură trimisă:
- `invoiceId` - Legătură cu factura
- `status` - pending/success/error
- `anafMessageId` - ID mesaj ANAF
- `xmlContent` - XML-ul generat
- `responseCode` - Cod răspuns ANAF

## 🚀 Utilizare

### API Endpoints

#### 1. Inițiază Autentificare
```http
GET /api/anaf/connect
```

Returnează:
```json
{
  "success": true,
  "authUrl": "https://logincert.anaf.ro/anaf/oauth2/v1/authorize?...",
  "message": "Redirect către ANAF pentru autentificare"
}
```

Frontend-ul trebuie să redirecționeze utilizatorul către `authUrl`.

#### 2. Callback (automat de la ANAF)
```http
GET /api/anaf/callback?code=...&state=...
```

Se apelează automat de ANAF după autentificare. Salvează token-urile și redirecționează către `/?anaf_connected=true`.

#### 3. Verifică Status Conexiune
```http
GET /api/anaf/status
```

Returnează:
```json
{
  "success": true,
  "connected": true,
  "isExpired": false,
  "expiresAt": "2025-12-03T23:00:00.000Z",
  "cui": "12345678",
  "companyName": "FIRMA SRL"
}
```

#### 4. Refresh Token Manual
```http
POST /api/anaf/refresh
```

Token-urile se refreshează automat când expiră, dar poți forța refresh manual.

#### 5. Deconectare
```http
POST /api/anaf/disconnect
```

Dezactivează conexiunea cu ANAF.

## 🔄 Flow Autentificare

```
1. User click "Conectează cont ANAF" în frontend
   ↓
2. Frontend: GET /api/anaf/connect
   ↓
3. Backend returnează authUrl
   ↓
4. Frontend: window.location.href = authUrl
   ↓
5. User se loghează pe portal ANAF cu SPV/certificat
   ↓
6. ANAF: redirect către /api/anaf/callback?code=...
   ↓
7. Backend: schimbă code în access_token + refresh_token
   ↓
8. Backend: salvează token-uri în DB
   ↓
9. Backend: redirect către /?anaf_connected=true
   ↓
10. Frontend: afișează mesaj "Conectat cu succes!"
```

## 🔐 Securitate

### OAuth State Protection
Fiecare request de autentificare generează un `state` aleator care se verifică la callback pentru protecție CSRF.

### Refresh Automat
Sistemul verifică automat dacă token-ul expiră în următoarele 5 minute și face refresh automat înainte de orice request către ANAF.

### Token Storage
Token-urile sunt stocate criptat în PostgreSQL și asociate cu user-ul autentificat.

## 📝 Următorii Pași

După configurarea autentificării, implementează:

1. **Generare XML UBL 2.1** - Conversie factură în format XML standard
2. **Upload Facturi** - POST către `/prod/FCTEH/public-v1/upload`
3. **Download Facturi Primite** - GET de la `/prod/FCTEH/public-v1/list`
4. **Monitorizare Status** - Verificare dacă factura a fost procesată

## 🧪 Testare

### Test Mod Development

Pentru testare locală fără ANAF real:
1. Setează `ANAF_CLIENT_ID=test_client`
2. Sistemul va simula autentificarea

### Test cu ANAF Test Environment

ANAF oferă un environment de test:
```env
ANAF_AUTH_URL=https://logincert-test.anaf.ro/anaf/oauth2/v1/authorize
ANAF_TOKEN_URL=https://logincert-test.anaf.ro/anaf/oauth2/v1/token
ANAF_API_BASE_URL=https://api-test.anaf.ro/test/FCTEH/public-v1
```

## ⚠️ Troubleshooting

### Eroare "invalid_state"
- Session-ul a expirat între request și callback
- Verifică dacă cookie-urile sunt activate

### Eroare "invalid_client"
- `client_id` sau `client_secret` greșite
- Verifică credențialele în `.env`

### Token expirat
- Token-urile ANAF expiră la 90 minute
- Sistemul face refresh automat, dar verifică `lastRefresh`

## 📚 Documentație Oficială ANAF

- Portal SPV: https://www.anaf.ro
- Documentație API: https://static.anaf.ro/static/10/Anaf/Informatii_R/doc_api_efactura.html
- UBL 2.1 Spec: http://docs.oasis-open.org/ubl/UBL-2.1.html
