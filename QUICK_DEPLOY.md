# ⚡ ChatBill - Quick Deploy (5 minute)

Ghid rapid pentru deployment pe **Railway** (cel mai simplu).

---

## 🚀 Deployment în 5 Pași

### Pas 1: Generează Secrete (30 secunde)

```bash
cd backend
npm run generate-secrets
```

Copiază output-ul - vei avea nevoie!

---

### Pas 2: Creare Cont Railway (1 minut)

1. Mergi la **[railway.app](https://railway.app)**
2. Click "Login" → "Login with GitHub"
3. Autorizează Railway

---

### Pas 3: Deploy Database (1 minut)

1. Click **"New Project"**
2. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
3. Așteaptă 30 secunde
4. Click pe PostgreSQL service
5. Tab **"Variables"** → Copiază **`DATABASE_URL`**

---

### Pas 4: Deploy App (2 minute)

1. Click **"+ New"** → **"GitHub Repo"**
2. Selectează repository-ul **`chatbill`**
3. Railway detectează Node.js automat
4. Click pe service-ul creat
5. Tab **"Variables"** → Click **"+ New Variable"**

**Add TOATE variabilele (copy-paste):**

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=[paste din PostgreSQL service]

# Secrets (din Pas 1)
JWT_SECRET=[paste primul secret]
SESSION_SECRET=[paste al doilea secret]

# URLs (Railway îți dă domain automat - îl găsești în "Settings")
BASE_URL=https://chatbill-production.up.railway.app
FRONTEND_URL=https://chatbill-production.up.railway.app

# Email (optional - dar recomandat)
RESEND_API_KEY=re_... # Get free from resend.com
EMAIL_FROM=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Stripe (optional)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
```

**⚠️ IMPORTANT:** Înlocuiește `chatbill-production.up.railway.app` cu domain-ul tău real din Railway!

---

### Pas 5: Deploy & Migrations (1 minut)

1. Click **"Deploy"** (buton verde)
2. Așteaptă ~2 minute (vezi progress în "Deployments")
3. Când e gata, click **"View Logs"**
4. Ar trebui să vezi: `Server-ul rulează pe portul 3000`

**Rulează migrations:**
1. Tab **"Settings"** → Scroll down
2. Click **"Service"** → găsește **"Shell"** sau **"Console"**
3. Rulează:
```bash
npx prisma migrate deploy
```

---

## ✅ Verificare Deployment

**Click pe URL-ul din Railway** (ceva gen: `https://chatbill-production.up.railway.app`)

Ar trebui să vezi aplicația! 🎉

**Test rapid:**
```bash
npm run health-check https://your-railway-url.railway.app
```

---

## 🔧 Troubleshooting Rapid

### "Cannot connect to database"
→ Verifică că `DATABASE_URL` este setat corect

### "Module not found"
→ În Railway, Settings → Deploy → **Root Directory**: `backend`

### "Build failed"
→ Verifică **Build Command**: `npm install && npx prisma generate`

### "App crashes immediately"
→ Check logs în Railway pentru erori

---

## 🎯 Next Steps

### 1. Custom Domain (Opțional)
1. Railway Settings → Domains → "Add Domain"
2. Add CNAME record la DNS provider
3. Update `BASE_URL` și `FRONTEND_URL` în Variables

### 2. Stripe Webhooks
1. [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://your-app.railway.app/api/webhooks/stripe`
4. Events: Select all `customer.subscription.*` și `invoice.*`
5. Copiază "Signing secret" → Add ca `STRIPE_WEBHOOK_SECRET`

### 3. Email Setup (Resend)
1. [Resend Dashboard](https://resend.com)
2. Create API Key
3. Add ca `RESEND_API_KEY` în Railway
4. Verify domain pentru a nu merge în spam

---

## 💰 Cost

**Railway Free Tier:**
- $5 credit/lună GRATIS
- Perfect pentru testare
- Sleeping după inactivitate

**Railway Starter (Recomandat):**
- $10/lună
- Always-on
- Mai multă putere

---

## 📊 Monitoring

**UptimeRobot (Free):**
1. [uptimerobot.com](https://uptimerobot.com)
2. Add monitor: `https://your-app.railway.app`
3. Primești email dacă pică site-ul

---

## 🆘 Need Help?

**Check logs:**
```
Railway → Service → Logs tab
```

**Common issues:**
- Database not connected → Check DATABASE_URL
- App crashes → Check environment variables
- Build fails → Check build command

**Documentation:**
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Ghid complet
- [Railway Docs](https://docs.railway.app)

---

## ✨ Success!

Dacă vezi aplicația live, **FELICITĂRI!** 🎉

Ai deploiat cu succes ChatBill pe internet!

**Share link-ul** cu cineva și testează:
1. Înregistrare user
2. Login
3. Creare factură
4. Download PDF

Totul funcționează? **Perfect!** 🚀

---

## 📱 Pro Tip

Railway îți dă un subdomain automat, dar poți adăuga custom domain:

**yourdomain.com** în loc de `chatbill-production.up.railway.app`

Vezi secțiunea "Custom Domain" mai sus! 🎯
