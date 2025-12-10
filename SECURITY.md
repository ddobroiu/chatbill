# 🔒 Ghid de Securitate ChatBill

Acest document descrie implementările de securitate și cele mai bune practici pentru aplicația ChatBill.

## 📋 Cuprins

1. [Modificări Recente de Securitate](#modificări-recente-de-securitate)
2. [Configurare Inițială](#configurare-inițială)
3. [Autentificare și Autorizare](#autentificare-și-autorizare)
4. [CORS și Rate Limiting](#cors-și-rate-limiting)
5. [Gestionarea Secretelor](#gestionarea-secretelor)
6. [Checklist Producție](#checklist-producție)
7. [Raportare Vulnerabilități](#raportare-vulnerabilități)

---

## 🔄 Modificări Recente de Securitate

### ✅ Îmbunătățiri Implementate (Decembrie 2024)

1. **Secrete Puternice Generate**
   - `JWT_SECRET`: 128 caractere hexadecimale aleatorii
   - `SESSION_SECRET`: 128 caractere hexadecimale aleatorii
   - Generare cu `crypto.randomBytes(64)`

2. **CORS Restricționat**
   - Permit doar origini specifice (`FRONTEND_URL`)
   - Development: `localhost:3000`, `localhost:5173`
   - Production: doar `https://chatbill.ro`

3. **Autentificare Securizată**
   - Eliminat fallback-ul nesigur la primul user activ
   - Token JWT obligatoriu pentru toate request-urile protejate
   - Mesaje de eroare non-verbose în producție

4. **Protecție Credențiale**
   - Fișierul `.env` nu este tracked în git (verificat în `.gitignore`)
   - Template `.env.example` pentru onboarding
   - Toate secretele rotate

---

## ⚙️ Configurare Inițială

### 1. Copiază Template-ul .env

```bash
cd backend
cp .env.example .env
```

### 2. Generează Secrete Puternice

```bash
# JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Session Secret
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

Copiază valorile generate în fișierul `.env`.

### 3. Configurează Variabilele de Mediu

Editează `backend/.env` și completează:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Secrets (generate mai sus)
JWT_SECRET=your-generated-jwt-secret
SESSION_SECRET=your-generated-session-secret

# CORS
FRONTEND_URL=https://your-domain.com

# APIs
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
```

---

## 🔐 Autentificare și Autorizare

### Sistem JWT

ChatBill folosește **JSON Web Tokens (JWT)** pentru autentificare:

- **Expirare**: 7 zile
- **Algoritm**: HS256
- **Header**: `Authorization: Bearer <token>`

### Middleware-uri

#### 1. `authenticateToken` (Obligatoriu)

Verifică token JWT și atașează utilizatorul la `req.user`.

```javascript
const { authenticateToken } = require('./middleware/auth');

app.get('/api/protected', authenticateToken, (req, res) => {
  // req.user conține datele utilizatorului
  res.json({ user: req.user });
});
```

#### 2. `requireRole` (Verificare Roluri)

Restricționează accesul pe bază de rol.

```javascript
const { authenticateToken, requireRole } = require('./middleware/auth');

app.delete('/api/users/:id',
  authenticateToken,
  requireRole('admin'),
  deleteUser
);
```

#### 3. `optionalAuth` (Opțional)

Permite request-uri cu sau fără token.

```javascript
const { optionalAuth } = require('./middleware/auth');

app.get('/api/public', optionalAuth, (req, res) => {
  // req.user poate fi undefined
  const isLoggedIn = !!req.user;
  res.json({ isLoggedIn });
});
```

### Hash-uire Parole

Folosim **bcryptjs** cu 10 salt rounds:

```javascript
const bcrypt = require('bcryptjs');

// La înregistrare
const hashedPassword = await bcrypt.hash(password, 10);

// La login
const isValid = await bcrypt.compare(password, user.password);
```

---

## 🌐 CORS și Rate Limiting

### Configurare CORS

Fișier: `backend/src/server.js`

```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://chatbill.ro',
  'http://localhost:3000',
  'http://localhost:5173',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### Rate Limiting (Recomandat pentru Producție)

Instalare:

```bash
npm install express-rate-limit
```

Implementare:

```javascript
const rateLimit = require('express-rate-limit');

// Limită generală
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 100, // 100 requests per IP
  message: 'Prea multe cereri din această adresă IP'
});

// Limită login (anti brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 încercări de login
  message: 'Prea multe încercări de autentificare. Încearcă din nou în 15 minute.'
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', loginLimiter);
```

---

## 🔑 Gestionarea Secretelor

### ❌ NU Face Niciodată

1. **NU** comite fișierul `.env` în Git
2. **NU** hardcodează API keys în cod
3. **NU** partajezi secretele prin email/chat
4. **NU** folosești secrete slabe sau default

### ✅ Fă Întotdeauna

1. **Folosește** `.env.example` pentru template-uri
2. **Rotează** secretele periodic (3-6 luni)
3. **Stochează** secretele de producție în:
   - Railway Secrets
   - AWS Secrets Manager
   - HashiCorp Vault
4. **Limitează** accesul la `.env` (permisiuni 600)

```bash
chmod 600 backend/.env
```

### Rotație Secrete

Când rotezi secretele:

1. Generează noi valori
2. Actualizează `.env` pe server
3. Restart aplicația
4. Invalidează token-urile vechi (opțional)

---

## ✅ Checklist Producție

Înainte de deploy în producție, verifică:

### Variabile de Mediu

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` configurată cu PostgreSQL de producție
- [ ] `JWT_SECRET` generat securizat (min 64 bytes)
- [ ] `SESSION_SECRET` generat securizat (min 64 bytes)
- [ ] `FRONTEND_URL` setată la domeniul real
- [ ] Toate API keys actualizate (OpenAI, Resend, ANAF)

### Securitate

- [ ] HTTPS activat (SSL/TLS)
- [ ] CORS restricționat la domeniul tău
- [ ] Rate limiting implementat
- [ ] Helmet.js instalat (headers securitate)
  ```bash
  npm install helmet
  ```
  ```javascript
  const helmet = require('helmet');
  app.use(helmet());
  ```
- [ ] Session cookies cu flag `secure: true`
- [ ] Validare input pe toate endpoint-urile
- [ ] SQL injection prevented (Prisma ORM)
- [ ] XSS protection activată

### Monitoring

- [ ] Logging configurat (Winston, Pino)
- [ ] Error tracking (Sentry, LogRocket)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Backup-uri automate database (zilnic)

### Performance

- [ ] Compresie gzip activată
  ```bash
  npm install compression
  ```
  ```javascript
  const compression = require('compression');
  app.use(compression());
  ```
- [ ] Static assets cached
- [ ] Database indexes optimizate
- [ ] Connection pooling PostgreSQL

---

## 🚨 Raportare Vulnerabilități

Dacă descoperi o vulnerabilitate de securitate în ChatBill:

### Proces

1. **NU** deschide un issue public pe GitHub
2. Trimite un email la: **security@chatbill.ro**
3. Include:
   - Descriere vulnerabilitate
   - Pași de reproducere
   - Impact potențial
   - Sugestii de remediere (opțional)

### Timp de Răspuns

- Confirmare primire: **24 ore**
- Evaluare inițială: **72 ore**
- Patch publicat: **7-14 zile** (în funcție de severitate)

### Hall of Fame

Contribuitori recunoscuți pentru raportări responsabile:

- *Lista va fi publicată aici*

---

## 📚 Resurse Suplimentare

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## 📝 Licență

Acest document este parte a proiectului ChatBill și este licențiat sub ISC.

**Ultima actualizare**: Decembrie 2024
