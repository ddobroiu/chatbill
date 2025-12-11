# 🚀 ChatBill - Ghid Deployment Complet

## 📋 Cuprins
1. [Pregătire Pre-Deployment](#pregătire-pre-deployment)
2. [Deployment pe Railway](#deployment-pe-railway)
3. [Deployment pe Render](#deployment-pe-render)
4. [Deployment pe VPS (Ubuntu)](#deployment-pe-vps)
5. [Deployment pe Vercel + Railway](#deployment-vercel--railway)
6. [Post-Deployment](#post-deployment)

---

## 🔧 Pregătire Pre-Deployment

### 1. Verifică că toate dependențele sunt instalate

```bash
cd backend
npm install
```

### 2. Generează secrete puternice

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Session Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Salvează aceste valori - le vei folosi în variabilele de mediu!

### 3. Verifică Prisma migrations

```bash
cd backend
npx prisma migrate status
npx prisma generate
```

### 4. Testează build-ul local

```bash
cd backend
npm run lint
npm run format:check
NODE_ENV=production node src/server.js
```

---

## 🚂 Deployment pe Railway (RECOMANDAT)

Railway este cel mai simplu pentru Node.js + PostgreSQL.

### Pas 1: Creare cont Railway

1. Mergi la [railway.app](https://railway.app)
2. Sign up cu GitHub
3. Click "New Project"

### Pas 2: Deploy Database

1. Click "+ New" → "Database" → "PostgreSQL"
2. Așteaptă să se creeze
3. Copiază `DATABASE_URL` din "Variables" tab

### Pas 3: Deploy Backend

1. Click "+ New" → "GitHub Repo" → Selectează `chatbill`
2. Railway va detecta automat Node.js

### Pas 4: Configurare Environment Variables

Click pe service → "Variables" → Add toate variabilele:

```env
# CRITICAL - Must be set first
NODE_ENV=production
PORT=3000
DATABASE_URL=[copiază din PostgreSQL service]

# Secrets (generează cu comenzile de mai sus)
JWT_SECRET=[your-64-byte-hex-secret]
SESSION_SECRET=[your-64-byte-hex-secret]

# URLs (Railway îți dă un domain automat)
BASE_URL=https://your-app.railway.app
FRONTEND_URL=https://your-app.railway.app

# Email (Resend - free tier 100 emails/day)
RESEND_API_KEY=[get from resend.com]
EMAIL_FROM=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
SUPPORT_EMAIL=support@yourdomain.com

# OpenAI (optional - pentru chat GPT)
OPENAI_API_KEY=[get from platform.openai.com]

# Stripe (get from dashboard.stripe.com)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
STRIPE_SUCCESS_URL=https://your-app.railway.app/#subscription-success
STRIPE_CANCEL_URL=https://your-app.railway.app/#subscription

# ANAF (optional - pentru e-Factura)
ANAF_CLIENT_ID=[from logincert.anaf.ro]
ANAF_CLIENT_SECRET=[from logincert.anaf.ro]
ANAF_REDIRECT_URI=https://your-app.railway.app/api/anaf/callback
```

### Pas 5: Configurare Build & Start

Railway ar trebui să detecteze automat, dar verifică:

**Settings → Deploy:**
- **Root Directory**: `backend`
- **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
- **Start Command**: `npm start`

### Pas 6: Deploy!

1. Click "Deploy"
2. Așteaptă 2-3 minute
3. Click pe URL-ul generat

### Pas 7: Rulează Migrations

În Railway console (CLI sau dashboard):

```bash
npx prisma migrate deploy
npx prisma db seed # dacă ai seed data
```

---

## 🎨 Deployment pe Render

### Pas 1: Creare cont Render

1. Mergi la [render.com](https://render.com)
2. Sign up cu GitHub

### Pas 2: Deploy Database

1. Click "New +" → "PostgreSQL"
2. Name: `chatbill-db`
3. Plan: Free
4. Click "Create Database"
5. Copiază "Internal Database URL"

### Pas 3: Deploy Backend

1. Click "New +" → "Web Service"
2. Connect repository `chatbill`
3. Configurare:
   - **Name**: `chatbill-api`
   - **Region**: Frankfurt (closest to Romania)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Plan**: Free (sau Starter $7/month pentru mai multă putere)

### Pas 4: Environment Variables

Add in "Environment" section:

```env
NODE_ENV=production
DATABASE_URL=[from PostgreSQL service]
JWT_SECRET=[generate]
SESSION_SECRET=[generate]
BASE_URL=[your-render-url]
FRONTEND_URL=[your-render-url]
RESEND_API_KEY=[from resend]
EMAIL_FROM=noreply@yourdomain.com
# ... rest of variables
```

### Pas 5: Deploy

Click "Create Web Service" → Așteaptă 5-10 minute

---

## 🖥️ Deployment pe VPS (Ubuntu 22.04)

Pentru control complet și costuri mici (5€/lună).

### Prerequisites

- VPS Ubuntu 22.04 (de la Hetzner, DigitalOcean, Contabo, etc.)
- Domain name pointat către VPS IP

### Pas 1: Setup Server

```bash
# Connect via SSH
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install Certbot (SSL)
apt install -y certbot python3-certbot-nginx

# Install PM2 (process manager)
npm install -g pm2
```

### Pas 2: Setup PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE chatbill;
CREATE USER chatbill_user WITH ENCRYPTED PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE chatbill TO chatbill_user;
\q
```

### Pas 3: Clone & Setup Project

```bash
# Create app user
adduser chatbill
usermod -aG sudo chatbill
su - chatbill

# Clone repo
git clone https://github.com/yourusername/chatbill.git
cd chatbill/backend

# Install dependencies
npm install

# Create .env file
nano .env
# Paste all environment variables
# DATABASE_URL=postgresql://chatbill_user:your-password@localhost:5432/chatbill

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Test server
npm start
# Ctrl+C to stop
```

### Pas 4: Setup PM2

```bash
# Start with PM2
pm2 start src/server.js --name chatbill-api

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs

# Check status
pm2 status
pm2 logs chatbill-api
```

### Pas 5: Setup Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/chatbill

# Paste this configuration:
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (static files)
    root /home/chatbill/chatbill/frontend;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets (invoices, proformas)
    location /invoices {
        alias /home/chatbill/chatbill/backend/invoices;
    }

    location /proformas {
        alias /home/chatbill/chatbill/backend/proformas;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/chatbill /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Pas 6: Setup SSL (HTTPS)

```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### Pas 7: Setup Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 🌐 Deployment Vercel (Frontend) + Railway (Backend)

Best of both worlds: Vercel CDN pentru frontend, Railway pentru backend.

### Pas 1: Deploy Backend pe Railway

Urmează pașii de la secțiunea Railway de mai sus.

### Pas 2: Deploy Frontend pe Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Follow prompts:
# - Project name: chatbill
# - Framework: Other
# - Build Command: (leave empty)
# - Output Directory: .
# - Development Command: (leave empty)

# Set production
vercel --prod
```

### Pas 3: Update Frontend URLs

În `frontend/js/app.js`, update API URL:

```javascript
const API_URL = 'https://your-railway-backend.railway.app';
```

Redeploy:
```bash
vercel --prod
```

---

## ✅ Post-Deployment Checklist

### Verificări Critice

- [ ] **Database funcționează**
  ```bash
  curl https://your-app.com/api/health
  ```

- [ ] **Migrations rulate**
  ```bash
  npx prisma migrate status
  ```

- [ ] **SSL funcționează (HTTPS)**
  ```bash
  curl -I https://your-app.com
  ```

- [ ] **Environment variables setate**
  - JWT_SECRET
  - DATABASE_URL
  - STRIPE keys
  - Email configuration

- [ ] **CORS configurat corect**
  - Testează din browser

- [ ] **Rate limiting funcționează**
  - Încearcă 5+ requests rapide

- [ ] **Logs funcționează**
  - Verifică backend/logs/ sau Railway logs

- [ ] **Stripe webhooks configurate**
  - Dashboard → Webhooks → Add endpoint
  - URL: `https://your-app.com/api/webhooks/stripe`
  - Events: `customer.subscription.*`, `invoice.*`, `checkout.session.*`

- [ ] **Email sending funcționează**
  - Testează înregistrare user

- [ ] **PDF generation funcționează**
  - Testează creare factură

### Monitoring Setup

**Option 1: UptimeRobot (Free)**
1. Mergi la [uptimerobot.com](https://uptimerobot.com)
2. Add monitor: `https://your-app.com/api/health`
3. Check interval: 5 minutes

**Option 2: Better Stack (Free tier)**
1. Mergi la [betterstack.com](https://betterstack.com)
2. Add website monitoring

**Option 3: Sentry (Error tracking)**
```bash
npm install @sentry/node
```

```javascript
// În server.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-sentry-dsn' });
```

### Backup Setup

**Database Backups:**

```bash
# Cron job pentru backup zilnic (pe VPS)
0 2 * * * pg_dump chatbill > /backup/chatbill_$(date +\%Y\%m\%d).sql
```

**Railway/Render:**
- Backups automate în plan-urile plătite

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Verifică DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Port already in use"
```bash
# Find process
lsof -i :3000
# Kill it
kill -9 <PID>
```

### "Prisma Client not generated"
```bash
npx prisma generate
```

### "Migration failed"
```bash
# Reset database (⚠️ ȘTERGE DATE)
npx prisma migrate reset

# Or deploy specific migration
npx prisma migrate deploy
```

### "Rate limit errors"
- Verifică că Redis/memory store funcționează
- Crește limitele în production

---

## 📊 Performance Tips

### 1. Enable Compression
```javascript
// În server.js
const compression = require('compression');
app.use(compression());
```

### 2. Cache Static Assets
```nginx
# În Nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Database Connection Pooling
```javascript
// Prisma automatically pools
// Max connections: 10 (adjust in schema.prisma)
```

### 4. Add Redis for Caching
```bash
# Install
npm install redis ioredis

# Use for session storage & caching
```

---

## 💰 Cost Estimates

### Free Tier (Good pentru început)
- **Railway**: Free $5/month credit
- **Render**: Free tier (sleeping after inactivity)
- **Vercel**: Unlimited pentru hobby
- **Total**: $0-5/month

### Starter (Recomandat)
- **Railway Starter**: $5/month (database) + $5/month (app)
- **Vercel Pro**: $20/month (optional)
- **Total**: $10-30/month

### Production
- **Railway Pro**: $20/month (database) + $20/month (app)
- **Cloudflare CDN**: Free
- **Backup storage**: $5/month
- **Total**: $45/month

### VPS (Best value)
- **Hetzner CX21**: €5.83/month (2 vCPU, 4GB RAM)
- **Domain**: €10/year
- **Total**: ~€6/month

---

## 🎉 Success!

Dacă toate checklist-urile sunt ✅, site-ul tău este LIVE! 🚀

**Next steps:**
1. Share link-ul cu primii utilizatori
2. Monitorizează logs primele zile
3. Setup analytics (Google Analytics, Plausible)
4. Add custom domain
5. Configure email domain (pentru a nu merge în spam)

Need help? Check logs:
- Railway: Dashboard → Logs tab
- Render: Dashboard → Logs
- VPS: `pm2 logs chatbill-api`

🎊 Felicitări pentru deployment! 🎊
