# 🚂 Railway Setup - Configurare Variabile

## ❌ Problema: "Application failed to respond"

Acest error înseamnă că aplicația pornește dar **lipsesc variabilele de mediu**.

---

## ✅ Soluție: Setează variabilele în Railway

### Pas 1: Generează Secretele (LOCAL pe laptop)

```bash
cd backend
npm run generate-secrets
```

**Salvează output-ul!** Ceva de genul:
```
JWT_SECRET=a6fcf09286b805829f6d47e5b923f39e58007578f011b78a5a4f53e3dc31e3c8...
SESSION_SECRET=0ac8329ec497abdc30199bc926fed7fc337133a38e58ebd3fd1a7bbb570962eb...
```

---

### Pas 2: Deschide Railway Dashboard

1. Mergi la [railway.app](https://railway.app)
2. Click pe proiectul tău `chatbill`
3. Vei vedea 2 services:
   - **PostgreSQL** (database)
   - **chatbill** (aplicația ta)

---

### Pas 3: Copiază DATABASE_URL

1. Click pe service-ul **PostgreSQL**
2. Click pe tab **"Variables"**
3. Găsește variabila **`DATABASE_URL`**
4. Click pe **Copy** (icon de copy lângă valoare)
5. Salvează undeva - vei avea nevoie în pasul următor!

Ar trebui să arate așa:
```
postgresql://postgres:password@postgres.railway.internal:5432/railway
```

---

### Pas 4: Setează Variabilele în Service-ul Aplicației

1. **Înapoi la proiect**, click pe service-ul **chatbill** (nu PostgreSQL!)
2. Click pe tab **"Variables"**
3. Click **"+ New Variable"**
4. **Adaugă TOATE variabilele de mai jos:**

#### Variabile OBLIGATORII:

**NODE_ENV**
```
production
```

**PORT**
```
3000
```

**DATABASE_URL**
```
[paste DATABASE_URL din PostgreSQL service - pasul 3]
```

**JWT_SECRET**
```
[paste JWT_SECRET din generate-secrets - pasul 1]
```

**SESSION_SECRET**
```
[paste SESSION_SECRET din generate-secrets - pasul 1]
```

**BASE_URL**
```
https://chatbill-production.up.railway.app
```
⚠️ **IMPORTANT**: Înlocuiește cu URL-ul REAL Railway!

Pentru a găsi URL-ul:
- Click pe service **chatbill**
- Tab **"Settings"** → scroll jos
- Secțiunea **"Domains"** → copiază URL-ul generat
- Ar trebui să arate: `https://[random-name].up.railway.app`

**FRONTEND_URL**
```
[ACELAȘI URL ca BASE_URL]
```

**OPENAI_API_KEY**
```
sk-proj-your-openai-api-key-here
```
Obține de la: https://platform.openai.com/api-keys

---

#### Variabile OPȚIONALE (dar recomandate):

**RESEND_API_KEY**
```
re_your-resend-api-key
```
Pentru email-uri. Obține de la: https://resend.com

**EMAIL_FROM**
```
contact@yourdomain.com
```

**ADMIN_EMAIL**
```
admin@yourdomain.com
```

---

#### Variabile pentru Stripe (dacă folosești abonamente):

**STRIPE_PUBLISHABLE_KEY**
```
pk_test_your_publishable_key
```

**STRIPE_SECRET_KEY**
```
sk_test_your_secret_key
```

**STRIPE_WEBHOOK_SECRET**
```
whsec_your_webhook_secret
```

**STRIPE_PRICE_MONTHLY**
```
price_monthly_id
```

**STRIPE_PRICE_ANNUAL**
```
price_annual_id
```

Obține de la: https://dashboard.stripe.com/apikeys

---

### Pas 5: Salvează și Redeploy

După ce ai adăugat toate variabilele:

1. Railway va **redeploy automat** când detectează schimbări în Variables
2. SAU poți forța redeploy:
   - Tab **"Deployments"**
   - Click **"Redeploy"** pe ultimul deployment

---

### Pas 6: Așteaptă Deployment (~2-3 minute)

1. Urmărește progress în tab **"Deployments"**
2. Click pe deployment pentru a vedea **logs în timp real**

**Ce ar trebui să vezi în logs:**
```
✓ Built successfully
✓ Migrations applied
✓ Server-ul rulează pe portul 3000
```

---

### Pas 7: Verificare

După deployment, click pe **URL-ul Railway** din Settings → Domains.

**Ar trebui să vezi aplicația ChatBill!** 🎉

---

## 🔍 Troubleshooting

### "Application failed to respond" ÎNCĂ

**Check logs:**
1. Railway → Service chatbill → Tab "Deployments"
2. Click pe ultimul deployment
3. Scroll prin logs și caută erori în roșu

**Cauze comune:**

#### Error: "DATABASE_URL is not defined"
→ Nu ai setat `DATABASE_URL` în Variables
→ Verifică că ai copiat corect din PostgreSQL service

#### Error: "JWT_SECRET is not defined"
→ Nu ai setat `JWT_SECRET` în Variables
→ Rulează `npm run generate-secrets` și copiază valoarea

#### Error: "Cannot connect to database"
→ `DATABASE_URL` este gresit
→ Verifică că DATABASE_URL are formatul: `postgresql://user:pass@host:port/db`

#### Error: "Prisma migration failed"
→ Migrations nu au rulat
→ Rulează manual în Railway Shell:
  1. Service chatbill → Settings → Shell
  2. Rulează: `cd backend && npx prisma migrate deploy`

---

## ✅ Checklist Final

Înainte de a testa aplicația:

- [ ] PostgreSQL database este activ (verde în Railway)
- [ ] Toate variabilele OBLIGATORII sunt setate
- [ ] `BASE_URL` și `FRONTEND_URL` sunt URL-ul REAL Railway
- [ ] `DATABASE_URL` este copiat din PostgreSQL service
- [ ] Deployment a terminat cu succes (fără erori în logs)
- [ ] Ai accesat URL-ul și vezi aplicația

---

## 🎯 După ce funcționează

### 1. Testează funcționalitatea:
- Înregistrare user nou
- Login
- Creează o factură
- Download PDF

### 2. Configurează Custom Domain (opțional):
- Railway Settings → Domains → Add custom domain
- Add CNAME la DNS provider
- Update `BASE_URL` și `FRONTEND_URL`

### 3. Setup Monitoring:
- [UptimeRobot](https://uptimerobot.com) - FREE
- Primești email dacă pică site-ul

---

## 📞 Need Help?

**Check environment variables:**
```bash
# În Railway Shell
printenv | grep -E "(DATABASE|JWT|SESSION|BASE_URL|FRONTEND)"
```

**Manual test database connection:**
```bash
# În Railway Shell
cd backend
node -e "require('./src/db/prisma').$connect().then(() => console.log('DB OK')).catch(e => console.log('DB ERROR:', e))"
```

**Health check:**
```bash
curl https://your-railway-url.up.railway.app/api/auth/me
# Ar trebui să returneze 401 (corect - nu ești autentificat)
```

---

**Mult succes!** 🚀

Dacă ai setat toate variabilele corect, aplicația va porni în ~2-3 minute!
