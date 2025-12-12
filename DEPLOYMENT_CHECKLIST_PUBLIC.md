# ✅ Checklist Deployment - ChatBill Public Access

## 🔍 Pre-Deployment Verificări

### 1. Database

- [ ] Rulat `npx prisma generate`
- [ ] Rulat `npx prisma migrate deploy`
- [ ] Verificat că migrația `add_user_id_to_invoice` e aplicată
- [ ] Testat conexiunea la PostgreSQL

```bash
cd backend
npx prisma studio  # Verifică vizual în browser
```

---

### 2. Backend Code

- [ ] Toate rutele au rate limiting configurat
- [ ] `optionalAuth` middleware funcționează corect
- [ ] `invoiceController.js` acceptă `provider` în request
- [ ] Errors handling corect (nu expune stack traces)
- [ ] Logger configurat (Winston)

---

### 3. Frontend Code

- [ ] `getProviderData()` citește corect din formular
- [ ] `localStorage` se salvează și se încarcă
- [ ] `generateInvoice()` trimite `provider` în request
- [ ] Messages/errors se afișează corect în UI
- [ ] Auto-completare ANAF funcționează

---

### 4. Environment Variables

#### Obligatorii

- [ ] `DATABASE_URL` - PostgreSQL connection string valid
- [ ] `JWT_SECRET` - Min 64 caractere (generat cu crypto)
- [ ] `SESSION_SECRET` - Min 64 caractere (generat cu crypto)
- [ ] `BASE_URL` - URL-ul aplicației (ex: https://chatbill.ro)
- [ ] `FRONTEND_URL` - URL frontend (ex: https://chatbill.ro)
- [ ] `NODE_ENV` - Setat la `production`

#### Opționale dar Recomandate

- [ ] `RESEND_API_KEY` - Pentru email (sau SMTP)
- [ ] `OPENAI_API_KEY` - Pentru chat AI
- [ ] `STRIPE_SECRET_KEY` - Pentru abonamente

#### Verificare Environment:

```bash
cd backend
node scripts/check-env.js  # Verifică toate variabilele
```

---

### 5. Testing Local

#### Test 1: Generare Factură Fără Cont

1. [ ] Deschide `http://localhost:3000`
2. [ ] Mergi la Setări → Date Companie
3. [ ] Completează toate câmpurile
4. [ ] Click "Salvează" → Mesaj success
5. [ ] Mergi la Facturi → Generare
6. [ ] Completează client + produse
7. [ ] Click "Generează Factură"
8. [ ] PDF se descarcă automat
9. [ ] Verifică PDF-ul - toate datele corecte

#### Test 2: Auto-completare ANAF (Public)

1. [ ] Mergi la Setări
2. [ ] Introdu CUI valid (ex: 12345678)
3. [ ] Click "Auto-completare"
4. [ ] Date se completează automat
5. [ ] Funcționează FĂRĂ token JWT

#### Test 3: Istoric Necesită Autentificare

1. [ ] Încearcă să accesezi `/api/invoices` (GET)
2. [ ] Ar trebui să primești 401 Unauthorized
3. [ ] Login cu cont valid
4. [ ] Acum istoricul funcționează

#### Test 4: localStorage Persistence

1. [ ] Salvează setări companie
2. [ ] Refresh pagina (F5)
3. [ ] Setările rămân (citite din localStorage)
4. [ ] Generează factură → folosește setările salvate

---

### 6. Security Audit

- [ ] CORS permite doar origini specifice
- [ ] Rate limiting activ pe toate rutele publice
- [ ] Validation (Zod) pe toate request-urile
- [ ] JWT tokens nu expiră prea repede (dar nici prea târziu)
- [ ] Error messages nu expun detalii interne
- [ ] SQL injection protection (Prisma)
- [ ] XSS protection (Content-Type headers)

---

### 7. Performance

- [ ] Prisma Client generat și optimizat
- [ ] PDF generation nu blochează serverul
- [ ] Rate limiting configurări rezonabile:
  - documentGenerationLimiter: 5/min
  - downloadLimiter: 10/min
  - autocompleteLimiter: 30/min
- [ ] Static files served efficient (invoices, proformas)

---

### 8. Monitoring & Logging

- [ ] Winston logger funcționează
- [ ] Log files se rotează (daily-rotate-file)
- [ ] Errors se loghează cu stack traces complete
- [ ] Request logging activ pentru debugging
- [ ] Health check endpoint funcționează:

```bash
curl http://localhost:3000/api/health
# Sau rulează:
node backend/scripts/health-check.js
```

---

## 🚀 Deployment Steps

### Option A: Railway

```bash
# 1. Push la Git
git add .
git commit -m "feat: public access - no login required"
git push origin main

# 2. Railway auto-deploy (dacă e configurat)
# SAU manual:
railway up

# 3. Rulează migrația
railway run npx prisma migrate deploy
```

### Option B: Render

```bash
# 1. Push la Git
git add .
git commit -m "feat: public access - no login required"
git push origin main

# 2. Render auto-deploy (via GitHub)

# 3. Rulează migrația în Render Shell:
npx prisma migrate deploy
```

### Option C: VPS (Manual)

```bash
# 1. SSH în server
ssh user@your-server.com

# 2. Pull latest code
cd /path/to/chatbill
git pull origin main

# 3. Install dependencies
cd backend
npm install

# 4. Run migrations
npx prisma migrate deploy

# 5. Restart server
pm2 restart chatbill
# SAU
systemctl restart chatbill
```

---

## 🧪 Post-Deployment Testing

### Test Production Environment

1. [ ] **Smoke Test:**
   ```bash
   curl https://yourdomain.com/api/health
   # Ar trebui să returneze 200 OK
   ```

2. [ ] **Public Invoice Creation:**
   - Accesează site-ul fără login
   - Generează o factură test
   - Verifică că PDF-ul se descarcă

3. [ ] **ANAF Auto-complete:**
   - Test cu CUI real
   - Verifică că datele se completează

4. [ ] **Authentication Still Works:**
   - Login cu cont existent
   - Verifică istoric facturi
   - Generează factură (ar trebui să salveze userId)

5. [ ] **Rate Limiting Active:**
   ```bash
   # Încearcă să generezi 10 facturi rapid
   # Ar trebui să blocheze după a 5-a
   ```

---

## 📊 Monitoring Post-Deploy

### First 24 Hours

- [ ] Verifică logs pentru errors:
  ```bash
  # Railway
  railway logs
  
  # Render
  # Logs în dashboard
  
  # VPS
  pm2 logs chatbill
  ```

- [ ] Monitorizează rate limiting:
  ```bash
  # Caută în logs:
  grep "rate limit" logs/*.log
  ```

- [ ] Verifică că database connection e stabilă:
  ```bash
  # Prisma Studio
  npx prisma studio
  ```

### Metrics to Watch

- [ ] Response times (ar trebui < 500ms pentru GET, < 2s pentru POST cu PDF)
- [ ] Error rate (ar trebui < 1%)
- [ ] Rate limit hits (câți useri sunt blocați - ajustează dacă e prea strict)
- [ ] Storage usage (PDF-urile ocupă spațiu - configurează cleanup)

---

## 🐛 Troubleshooting

### Issue: "Completați datele companiei"

**Cauză:** Frontend nu trimite `provider` în request.

**Fix:**
1. Verifică că `getProviderData()` returnează date valide
2. Verifică că `generateInvoice()` include `provider` în body
3. Verifică localStorage pentru `companySettings`

---

### Issue: 401 Unauthorized la creare factură

**Cauză:** Route-ul folosește `authenticateToken` în loc de `optionalAuth`.

**Fix:**
```javascript
// În invoiceRoutes.js
router.post('/create', optionalAuth, ...); // NU authenticateToken
```

---

### Issue: userId null în toate facturile

**Cauză:** optionalAuth nu setează `req.user` corect.

**Fix:**
Verifică că middleware-ul `optionalAuth` din `auth.js` funcționează:
```javascript
if (token) {
  // decode token
  req.user = user; // Setează user dacă token valid
}
next(); // Continuă oricum (optional auth)
```

---

### Issue: localStorage nu persistă

**Cauză:** Browser settings sau incognito mode.

**Fix:**
- Verifică în DevTools → Application → Local Storage
- Asigură-te că nu e în incognito/private mode
- Testează în alt browser

---

### Issue: PDF generation fails

**Cauză:** Fonts lipsă sau pdfkit-table probleme.

**Fix:**
```bash
# Reinstall dependencies
npm install --force

# Verifică fonts în backend/assets/fonts/
ls -la backend/assets/fonts/
```

---

## ✅ Final Checklist

Înainte de a considera deployment-ul complet:

- [ ] ✅ Toate testele locale trec
- [ ] ✅ Migrația Prisma aplicată în producție
- [ ] ✅ Environment variables configurate corect
- [ ] ✅ Smoke tests în producție trec
- [ ] ✅ Rate limiting funcționează
- [ ] ✅ Logging activ și funcțional
- [ ] ✅ Backup database configurat (recomandabil)
- [ ] ✅ Monitoring/alerting configurat (opțional dar bun)
- [ ] ✅ Documentație actualizată pentru echipă

---

## 🎉 Success!

Dacă toate checkbox-urile de mai sus sunt bifate, **deployment-ul e complet și funcțional**!

### Next Steps:

1. 📊 Monitorizează metrics primele 48h
2. 📧 Anunță userii despre noua funcționalitate
3. 📝 Colectează feedback
4. 🔄 Iterează pe baza feedback-ului

---

**ChatBill Public Access - Live!** 🚀
