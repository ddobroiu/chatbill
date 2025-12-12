# Railway Deployment Checklist

## ✅ Variabile de Mediu Care TREBUIE să existe în Railway

### Critical (aplicația nu pornește fără ele):
- [ ] `DATABASE_URL` - Railway îl generează automat când adaugi PostgreSQL
- [ ] `STRIPE_SECRET_KEY` - ✅ Ai adăugat
- [ ] `STRIPE_PUBLISHABLE_KEY` - ✅ Ai adăugat
- [ ] `STRIPE_WEBHOOK_SECRET` - ✅ Ai adăugat
- [ ] `STRIPE_PRICE_MONTHLY` - ❌ LIPSEȘTE (e încă "price_monthly_id_here")
- [ ] `STRIPE_PRICE_ANNUAL` - ❌ LIPSEȘTE (e încă "price_annual_id_here")

### Importante pentru funcționare:
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` - ai din .env
- [ ] `SESSION_SECRET` - ai din .env
- [ ] `OPENAI_API_KEY` - ai din .env
- [ ] `RESEND_API_KEY` - ai din .env
- [ ] `BASE_URL` - trebuie să fie URL-ul Railway (ex: https://chatbill-production.up.railway.app)
- [ ] `FRONTEND_URL` - trebuie să fie URL-ul Railway sau domeniul tău
- [ ] `EMAIL_FROM=contact@chatbill.ro`
- [ ] `SUPPORT_EMAIL=contact@chatbill.ro`
- [ ] `ADMIN_EMAIL=contact@chatbill.ro`

### ANAF Integration:
- [ ] `ANAF_CLIENT_ID` - ai din .env
- [ ] `ANAF_CLIENT_SECRET` - ai din .env
- [ ] `ANAF_REDIRECT_URI` - trebuie actualizat cu URL-ul Railway
- [ ] `ANAF_AUTH_URL` - ai din .env
- [ ] `ANAF_TOKEN_URL` - ai din .env
- [ ] `ANAF_REVOKE_URL` - ai din .env

### IAPP Integration:
- [ ] `IAPP_API_USERNAME` - ai din .env
- [ ] `IAPP_API_PASSWORD` - ai din .env
- [ ] `IAPP_API_URL` - ai din .env
- [ ] `IAPP_EMAIL_RESPONSABIL` - ai din .env

### WhatsApp (opțional):
- [ ] `WHATSAPP_PHONE_NUMBER_ID` - ai din .env
- [ ] `META_APP_SECRET` - ai din .env
- [ ] `META_VERIFY_TOKEN` - ai din .env
- [ ] `META_APP_ID` - ai din .env

## 🔧 Cum să obții STRIPE_PRICE_MONTHLY și STRIPE_PRICE_ANNUAL

1. Mergi pe https://dashboard.stripe.com/products
2. Click "Add Product"
3. Creează primul produs:
   - **Name**: ChatBill Monthly Subscription
   - **Price**: €4.99 (sau prețul tău)
   - **Billing period**: Monthly
   - **Currency**: EUR
   - Click "Save"
   - **Copiază Price ID** (începe cu `price_...`) → asta e STRIPE_PRICE_MONTHLY

4. Creează al doilea produs:
   - **Name**: ChatBill Annual Subscription
   - **Price**: €49.99 (sau prețul tău)
   - **Billing period**: Yearly
   - **Currency**: EUR
   - Click "Save"
   - **Copiază Price ID** (începe cu `price_...`) → asta e STRIPE_PRICE_ANNUAL

## 🚀 Pași finali în Railway:

1. **Adaugă Database**:
   - În Railway Dashboard → New → Database → PostgreSQL
   - Railway va crea automat variabila `DATABASE_URL`

2. **Verifică variabilele**:
   - Settings → Variables
   - Asigură-te că TOATE variabilele de mai sus sunt setate

3. **Verifică Logs**:
   - Click pe deployment
   - Uită-te la "Deploy Logs" și "Application Logs"
   - Caută erori specifice

## 🐛 Probleme comune:

### "Application failed to respond"
- Check dacă DATABASE_URL există
- Check dacă PORT este setat (Railway îl setează automat la runtime)
- Check dacă aplicația pornește pe `process.env.PORT` (server.js:138)

### "Module not found" sau "Cannot find package"
- Verifică dacă `npm ci` rulează în backend/ (nixpacks.toml:8)
- Verifică dacă `npx prisma generate` rulează (nixpacks.toml:14)

### Database connection failed
- Verifică dacă ai adăugat PostgreSQL database în Railway
- Verifică dacă DATABASE_URL este corect setat

## 📝 Unde să verifici logs în Railway:

1. Click pe proiectul tău
2. Click pe serviciul backend
3. Click pe tab-ul "Deployments"
4. Click pe ultimul deployment
5. Vezi:
   - **Build Logs** - pentru erori la build
   - **Deploy Logs** - pentru erori la deploy
   - **Application Logs** - pentru erori din aplicație

## ⚠️ IMPORTANT:

Railway NU citește fișierul `.env` - trebuie să adaugi manual fiecare variabilă în Dashboard!
