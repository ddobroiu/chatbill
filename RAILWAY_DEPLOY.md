# ChatBill - Railway Deployment Guide

## 🚀 Quick Deploy

### Step 1: Configure Environment Variables

În Railway dashboard, adaugă următoarele variabile:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@host:port/database

# ANAF OAuth
ANAF_CLIENT_ID=your_client_id
ANAF_CLIENT_SECRET=your_client_secret
ANAF_REDIRECT_URI=https://your-app.railway.app/api/anaf/callback
ANAF_AUTH_URL=https://logincert.anaf.ro/anaf-oauth2/v1/authorize
ANAF_TOKEN_URL=https://logincert.anaf.ro/anaf-oauth2/v1/token
ANAF_REVOKE_URL=https://logincert.anaf.ro/anaf-oauth2/v1/revoke

# iApp API (ANAF Validation)
IAPP_API_USERNAME=your_username
IAPP_API_PASSWORD=your_password
IAPP_API_URL=https://api.my.iapp.ro
IAPP_EMAIL_RESPONSABIL=your_email@domain.com

# Security
SESSION_SECRET=your-super-secret-session-key-min-32-chars
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# OpenAI
OPENAI_API_KEY=sk-proj-your-openai-api-key

# App Config
BASE_URL=https://your-app.railway.app
PORT=3000
NODE_ENV=production
```

### Step 2: Deploy

Railway va detecta automat configurația și va rula:

1. **Build**: `npm install` + `npx prisma generate`
2. **Start**: `npm start` (din directorul backend)

### Step 3: Run Migrations

După primul deploy, rulează migrațiile manual:

```bash
railway run npx prisma migrate deploy
```

Sau conectează-te la shell:

```bash
railway shell
cd backend
npx prisma migrate deploy
```

## 📁 Project Structure

```
chatbill/
├── backend/           # Node.js + Express + Prisma
│   ├── src/
│   │   ├── server.js
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middleware/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
├── frontend/          # Static HTML/CSS/JS
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   └── js/app.js
├── package.json       # Root package (pentru Railway)
├── Procfile          # Railway start command
├── nixpacks.toml     # Nixpacks config
└── railway.json      # Railway config
```

## 🔧 Local Development

```bash
# Install dependencies
cd backend
npm install

# Setup database
npx prisma migrate dev

# Start server
npm run dev
```

## 🌐 Production URLs

- **Backend API**: `https://your-app.railway.app/api`
- **Frontend**: `https://your-app.railway.app`
- **Health Check**: `https://your-app.railway.app/api/settings`

## 📊 Database Migrations

Existing migrations:
1. `init_postgresql` - Initial schema
2. `add_chat_and_products` - Chat sessions & products
3. `add_anaf_efactura` - ANAF OAuth integration
4. `add_user_auth_fields` - User authentication
5. `update_chatmessage_for_gpt` - GPT chat support

## 🔐 Security Notes

- ✅ Toate variabilele sensibile în Railway Environment Variables
- ✅ HTTPS automat pe Railway
- ✅ JWT authentication pentru toate API-urile
- ✅ bcrypt pentru hash-uirea parolelor
- ✅ CORS configurat pentru producție

## 🐛 Troubleshooting

### Build fails

```bash
# Check logs
railway logs

# Rebuild
railway up --detach
```

### Database connection issues

```bash
# Verify DATABASE_URL format
postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# Test connection
railway run npx prisma db pull
```

### Prisma Client errors

```bash
# Regenerate client
railway run npx prisma generate
```

## 📞 Support

Pentru probleme sau întrebări, verifică:
- Railway logs: `railway logs`
- Database status: Railway dashboard
- Environment variables: Railway settings

## 🎉 Features

- ✅ JWT Authentication
- ✅ GPT-4 Chat Assistant
- ✅ ANAF e-Factura Integration
- ✅ Invoice Generation (PDF)
- ✅ Company Validation (ANAF API)
- ✅ Conversational AI Invoice Creation
- ✅ Settings Management
- ✅ User Profile & Password Reset
