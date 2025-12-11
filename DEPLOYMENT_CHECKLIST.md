# ✅ ChatBill - Deployment Checklist

Folosește acest checklist pentru a te asigura că nu uiți nimic înainte de deployment.

---

## 📋 Pre-Deployment Checklist

### 1. Cod & Configurare

- [ ] **Git repository este up-to-date**
  ```bash
  git status
  git add .
  git commit -m "Ready for deployment"
  git push origin main
  ```

- [ ] **Toate dependencies sunt instalate**
  ```bash
  cd backend
  npm install
  ```

- [ ] **ESLint rulează fără erori**
  ```bash
  npm run lint
  ```

- [ ] **Prisma schema este validă**
  ```bash
  npx prisma validate
  ```

### 2. Environment Variables

- [ ] **Secrete generate**
  ```bash
  npm run generate-secrets
  ```
  Salvează output-ul într-un loc sigur!

- [ ] **Verifică variabilele necesare**
  ```bash
  npm run check-env
  ```

- [ ] **Toate variabilele minime sunt pregătite:**
  - `NODE_ENV=production`
  - `PORT=3000`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `SESSION_SECRET`
  - `BASE_URL`
  - `FRONTEND_URL`
  - `OPENAI_API_KEY`

### 3. Database

- [ ] **Migrările sunt up-to-date local**
  ```bash
  npx prisma migrate status
  ```

- [ ] **Prisma client este generat**
  ```bash
  npx prisma generate
  ```

### 4. Securitate

- [ ] **`.env` NU este commitată în Git**
  ```bash
  git check-ignore .env
  # Ar trebui să returneze: .env
  ```

- [ ] **Secretele au minimum 64 caractere**

- [ ] **CORS permite doar domeniul tău**
  Verifică în `backend/src/server.js`

- [ ] **Rate limiting este activ**
  Verifică că middleware-ul este în `server.js`

---

## 🚀 Deployment Steps (Railway - Recomandat)

### Pas 1: Crează Cont Railway
- [ ] Mergi la [railway.app](https://railway.app)
- [ ] Login cu GitHub
- [ ] Autorizează Railway să acceseze repository-urile

### Pas 2: Crează PostgreSQL Database
- [ ] Click "New Project"
- [ ] Click "+ New" → "Database" → "PostgreSQL"
- [ ] Așteaptă ~30 secunde până se creează
- [ ] Click pe PostgreSQL service
- [ ] Tab "Variables" → Copiază `DATABASE_URL`

### Pas 3: Deploy Application
- [ ] În același project, click "+ New" → "GitHub Repo"
- [ ] Selectează repository-ul `chatbill`
- [ ] Railway detectează Node.js automat
- [ ] Click pe service-ul nou creat

### Pas 4: Configurează Variables
- [ ] Click tab "Variables"
- [ ] Click "+ New Variable"
- [ ] Adaugă toate variabilele:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=[paste din PostgreSQL service]
JWT_SECRET=[paste din generate-secrets]
SESSION_SECRET=[paste din generate-secrets]
BASE_URL=https://[your-railway-url].railway.app
FRONTEND_URL=https://[your-railway-url].railway.app
OPENAI_API_KEY=[your OpenAI key]

# Optional dar recomandat:
RESEND_API_KEY=[your Resend key]
EMAIL_FROM=contact@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Dacă folosești Stripe:
STRIPE_PUBLISHABLE_KEY=[your Stripe key]
STRIPE_SECRET_KEY=[your Stripe secret]
STRIPE_WEBHOOK_SECRET=[your webhook secret]
STRIPE_PRICE_MONTHLY=[your price ID]
STRIPE_PRICE_ANNUAL=[your price ID]
```

- [ ] Verifică că `BASE_URL` și `FRONTEND_URL` sunt URL-ul real Railway

### Pas 5: Deploy & Wait
- [ ] Click "Deploy" (buton verde)
- [ ] Așteaptă ~2-3 minute
- [ ] Monitorizează în tab "Deployments"
- [ ] Verifică logs pentru erori

### Pas 6: Run Migrations
- [ ] După deployment complet, mergi la tab "Settings"
- [ ] Scroll down → găsește "Shell" sau "Console"
- [ ] Rulează:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Verifică că migrările au rulat cu succes

### Pas 7: Get Domain URL
- [ ] Tab "Settings" → secțiunea "Domains"
- [ ] Copiază URL-ul (ex: `chatbill-production.up.railway.app`)
- [ ] Actualizează `BASE_URL` și `FRONTEND_URL` în Variables (dacă diferă)
- [ ] Redeploy dacă ai schimbat variabilele

---

## ✅ Post-Deployment Verification

### Test 1: Server pornit?
- [ ] Deschide URL-ul Railway în browser
- [ ] Ar trebui să vezi aplicația ChatBill

### Test 2: API funcționează?
- [ ] Rulează health check local:
  ```bash
  cd backend
  npm run health-check https://[your-railway-url].railway.app
  ```
- [ ] Ar trebui să vezi mesaje ✅ pentru toate endpoint-urile

### Test 3: Înregistrare User
- [ ] Deschide aplicația în browser
- [ ] Click pe "Înregistrare"
- [ ] Creează un cont nou
- [ ] Verifică că primești email de confirmare (dacă ai Resend configurat)

### Test 4: Login
- [ ] Loghează-te cu contul creat
- [ ] Verifică că ești redirecționat la dashboard

### Test 5: Creează Factură
- [ ] Click pe "Generator facturi"
- [ ] Completează datele companiei
- [ ] Adaugă un produs/serviciu
- [ ] Click "Generează factură"
- [ ] Verifică că factura apare în listă

### Test 6: Download PDF
- [ ] Click pe factura creată
- [ ] Click "Download PDF"
- [ ] Verifică că PDF-ul se descarcă și este corect formatat

### Test 7: Chat GPT (dacă ai OpenAI key)
- [ ] Click pe "Chat GPT"
- [ ] Trimite un mesaj test
- [ ] Verifică că primești răspuns

### Test 8: Mobile
- [ ] Deschide aplicația pe telefon
- [ ] Verifică că hamburger menu funcționează
- [ ] Testează navigarea
- [ ] Verifică că toate funcțiile merg

---

## 🔍 Debugging Checklist

### Dacă aplicația nu pornește:

- [ ] **Check Logs în Railway**
  - Tab "Logs" → caută erori în roșu

- [ ] **Verifică Environment Variables**
  - Tab "Variables" → toate sunt setate?
  - `DATABASE_URL` este corect?
  - `JWT_SECRET` și `SESSION_SECRET` există?

- [ ] **Verifică Build Command**
  - Tab "Settings" → Deploy
  - Build Command: `cd backend && npm install && npx prisma generate`
  - Start Command: `cd backend && npm start`

- [ ] **Verifică Database Connection**
  - Click pe PostgreSQL service
  - Status ar trebui "Active"
  - Verifică `DATABASE_URL` în Variables

### Dacă aplicația crashes:

- [ ] **Check error logs specific**
  ```
  Railway → Service → Logs → filtrează "error"
  ```

- [ ] **Verifică că migrările au rulat**
  - Shell în Railway
  - Rulează: `npx prisma migrate status`

- [ ] **Restart aplicația**
  - Railway → Service → Settings → Restart

### Dacă database nu se conectează:

- [ ] **Verifică DATABASE_URL format**
  ```
  postgresql://USER:PASSWORD@HOST:PORT/DATABASE
  ```

- [ ] **Testează conexiunea manual**
  ```bash
  # În Railway shell
  node -e "require('./src/db/prisma').default.$connect().then(() => console.log('OK'))"
  ```

---

## 🎯 Optional Steps (After Successful Deployment)

### 1. Custom Domain
- [ ] Railway: Settings → Domains → "Add Domain"
- [ ] Add CNAME record la DNS provider:
  ```
  Type: CNAME
  Name: chatbill (sau subdomain dorit)
  Value: [railway-generated-domain]
  ```
- [ ] Așteaptă propagare DNS (5-30 minute)
- [ ] Update `BASE_URL` și `FRONTEND_URL` în Railway Variables
- [ ] Redeploy

### 2. Stripe Webhooks (dacă folosești Stripe)
- [ ] Mergi la [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
- [ ] Click "Add endpoint"
- [ ] URL: `https://[your-domain]/api/webhooks/stripe`
- [ ] Selectează events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Copiază "Signing secret"
- [ ] Adaugă ca `STRIPE_WEBHOOK_SECRET` în Railway
- [ ] Redeploy

### 3. Email Setup (Resend)
- [ ] Crează cont la [resend.com](https://resend.com)
- [ ] Create API Key
- [ ] Adaugă ca `RESEND_API_KEY` în Railway
- [ ] Verify domain pentru a nu merge în spam:
  - Resend Dashboard → Domains → Add domain
  - Add DNS records la provider
- [ ] Redeploy

### 4. Monitoring & Alerts
- [ ] Setup [UptimeRobot](https://uptimerobot.com)
  - Add monitor: `https://[your-domain]`
  - Check interval: 5 minutes
  - Alert email când pică site-ul

- [ ] Railway Notifications
  - Railway Settings → Notifications
  - Enable email alerts pentru deploy failures

### 5. Backup Strategy
- [ ] Enable Railway automatic backups (dacă disponibil)
- [ ] Sau setup backup script manual:
  ```bash
  # Cron job zilnic pentru backup
  0 2 * * * pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
  ```

### 6. SSL/HTTPS Certificate
- [ ] Verifică că Railway oferă SSL automat
- [ ] Testează HTTPS: https://[your-domain]
- [ ] Verifică că HTTP redirectează la HTTPS

---

## 📊 Performance Checklist (Viitor)

După ce aplicația rulează stabil:

- [ ] Implementează Redis caching (vezi [RECOMMENDED_NEXT.md](RECOMMENDED_NEXT.md))
- [ ] Adaugă database indexes
- [ ] Setup CDN pentru static assets
- [ ] Implementează rate limiting mai agresiv
- [ ] Monitorizare performance (New Relic, DataDog)

---

## 🎉 Success!

Dacă ai bifat toate checklist-urile de mai sus:

✅ **FELICITĂRI!** Aplicația ta ChatBill este LIVE pe internet! 🚀

**Următorii pași:**
1. Share link-ul cu prietenii/clienții
2. Testează toate funcțiile
3. Monitorizează logs primele 24h
4. Setup monitoring automat (UptimeRobot)
5. Bucură-te de aplicația ta! 🎉

---

## 📞 Support Resources

- **[START_DEPLOYMENT.md](START_DEPLOYMENT.md)** - Ghid quick start
- **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)** - Ghid rapid 5 minute
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Ghid complet detaliat
- **[Railway Docs](https://docs.railway.app)** - Documentație Railway
- **[Prisma Docs](https://prisma.io/docs)** - Documentație Prisma

---

**Happy Deploying!** 🚀
