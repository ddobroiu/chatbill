# 🎉 ChatBill - Acum funcționează FĂRĂ cont!

## ✨ Noutăți - Acces Public

ChatBill poate fi folosit **fără autentificare**! Poți genera facturi, proforma și oferte chiar și fără cont.

## 🚀 Cum funcționează?

### Pentru Utilizatori Fără Cont

1. **Deschide aplicația** - intri direct la `http://localhost:3000`
2. **Configurează datele companiei tale** în secțiunea **Setări**:
   - CUI, Nume companie, Adresă
   - Date bancare (IBAN, Bancă)
   - Contact (Email, Telefon)
   - Setări TVA
   - Seriile de numerotare

3. **Setările se salvează în browser** (localStorage) - nu se pierd la refresh
4. **Generezi facturi imediat** - fără înregistrare!

### Limitări pentru Useri Neautentificați

- ❌ **Nu poți vedea istoric facturi** - doar generezi și descarci PDF-ul imediat
- ❌ **Setările nu sunt sincronizate** între dispozitive
- ❌ **Pierzi datele dacă ștergi istoricul browserului**
- ❌ **Nu ai backup cloud** pentru documente
- ❌ **Nu poți folosi integrarea ANAF e-Factura**

### Avantaje cu Cont (Gratuit)

- ✅ **Istoric complet** al tuturor facturilor/proformelor/ofertelor
- ✅ **Sincronizare între dispozitive**
- ✅ **Backup cloud** - datele tale sunt sigure
- ✅ **Integrare ANAF** e-Factura
- ✅ **Trimitere automată** la clienți prin email
- ✅ **Statistici și rapoarte**

## 📋 Fluxul de Lucru

### Fără Cont

```
1. Intră pe site
2. Completează setări companie (salvare locală)
3. Generează factură
4. Descarcă PDF imediat
5. Gata! (nu se salvează istoric)
```

### Cu Cont

```
1. Înregistrare/Login
2. Configurează setări (salvare în cloud)
3. Generează factură
4. Vezi în istoric
5. Descarcă oricând
6. Trimite la ANAF
7. Email către client
```

## 🔧 Setup pentru Development

### 1. Configurare Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm start
```

### 2. Deschide Frontend

Deschide `frontend/index.html` în browser sau rulează un server local:

```bash
# Opțiunea 1: Python
cd frontend
python -m http.server 3001

# Opțiunea 2: Node.js (http-server)
cd frontend
npx http-server -p 3001

# Opțiunea 3: Live Server (VS Code)
# Click dreapta pe index.html -> Open with Live Server
```

### 3. Testează

1. Deschide `http://localhost:3000` (sau 3001 dacă ai server separat)
2. Mergi la **Setări > Date Companie**
3. Completează CUI-ul și apasă **Auto-completare ANAF** (funcționează fără cont!)
4. Salvează setările
5. Mergi la **Facturi > Generare Factură**
6. Completează date client și produse
7. **Generează Factură** - gata!

## 🎯 Caracteristici Publice (fără cont)

### ✅ Ce funcționează fără autentificare:

- 📄 **Generare facturi** cu PDF descărcabil
- 📋 **Generare proforma** cu PDF descărcabil
- 💼 **Generare oferte** cu PDF descărcabil
- 🎨 **4 template-uri PDF** (Modern, Classic, Minimal, Elegant)
- 🔍 **Auto-completare ANAF** din CUI
- 💾 **Salvare setări** în browser
- 🧮 **Calculator automat** TVA și totaluri

### ❌ Ce necesită autentificare:

- 📚 **Istoric documente** (listă, editare, ștergere)
- 📊 **Dashboard statistici**
- 📧 **Trimitere email** către clienți
- 🏛️ **Integrare ANAF** e-Factura
- 💬 **Chat AI** pentru generare conversațională
- 📱 **WhatsApp Business** integration
- 💳 **Abonamente premium** (Stripe)
- ☁️ **Backup cloud** și sincronizare

## 🔐 Securitate

### Modificări Backend

- ✅ **optionalAuth middleware** - permite acces fără token
- ✅ **userId opțional** în Invoice, Proforma, Offer
- ✅ **Validation** - datele companiei emitente vin din request sau DB
- ✅ **Rate limiting** - protecție împotriva abuse chiar și pentru public

### Protecții Active

- ✅ **Rate limiting** - max 5 documente/minut (documentGenerationLimiter)
- ✅ **Validare input** - Zod schemas pentru toate request-urile
- ✅ **CORS** - doar origini permise
- ✅ **Prisma ORM** - protecție SQL injection
- ✅ **Error handling** - mesaje generice către public

## 📱 Responsivitate

Site-ul funcționează perfect pe:
- 💻 Desktop
- 📱 Mobile
- 📲 Tabletă

## 🚀 Deployment

### Environment Variables Necesare

Minim pentru funcționare publică:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-min-64-chars
SESSION_SECRET=your-secret-min-64-chars
BASE_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

Pentru funcționalități complete (opțional):

```env
RESEND_API_KEY=...        # Email
OPENAI_API_KEY=...        # Chat AI
STRIPE_SECRET_KEY=...     # Abonamente
ANAF_CLIENT_ID=...        # e-Factura
WHATSAPP_ACCESS_TOKEN=... # WhatsApp
```

## 💡 Use Cases

### 1. Freelancer fără cont
"Vreau să generez o factură rapid pentru un client"
→ **Perfect!** Intră, completează date, generează, descarcă PDF

### 2. Companie mică care testează
"Vreau să văd cum arată facturile înainte să mă înregistrez"
→ **Ideal!** Testează toate template-urile fără obligații

### 3. Utilizator ocazional
"Fac o factură pe lună, nu vreau cont"
→ **Funcționează!** Setările rămân în browser

### 4. Power user cu istoric
"Am zeci de facturi, vreau istoric și backup"
→ **Creează cont!** Beneficiezi de toate funcțiile avansate

## 🎨 Template-uri PDF Disponibile

Toate template-urile funcționează fără cont:

1. **Modern** 🎨 - Design modern cu accente colorate
2. **Classic** 📋 - Stil tradițional, profesional
3. **Minimal** ⚪ - Clean, simplu, elegant
4. **Elegant** ✨ - Sofisticat pentru branduri premium

## 📞 Support

Pentru probleme sau întrebări:
- 📧 Email: support@chatbill.ro
- 💬 Chat: Direct din aplicație (dacă ai cont)
- 🐛 Issues: GitHub repository

## 🔄 Următorii Pași

### Pentru tine ca utilizator:
1. ✅ Testează generarea de facturi fără cont
2. ✅ Dacă îți place, creează cont pentru istoric
3. ✅ Explorează funcțiile avansate (ANAF, AI chat)

### Pentru dezvoltatori:
1. ✅ Implementat acces public pentru documente
2. 🔄 Adaugă export batch pentru useri cu cont
3. 🔄 Dashboard statistici avansate
4. 🔄 API public cu rate limiting mai permisiv

---

**ChatBill** - Facturare simplă, cu sau fără cont! 🎉
