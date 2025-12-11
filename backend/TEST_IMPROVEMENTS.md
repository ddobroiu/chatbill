# Test Plan - Îmbunătățiri ChatBill

## ✅ Checklist Testing Rapid

### 1. Testare Validare Input (Zod)

```bash
# Test 1: Email invalid
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email",
    "password": "test123456",
    "confirmPassword": "test123456"
  }'

# Așteptat: 400 cu mesaj "Email invalid"

# Test 2: Parolă prea scurtă
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "123",
    "confirmPassword": "123"
  }'

# Așteptat: 400 cu mesaj "Parola trebuie să aibă minimum 8 caractere"

# Test 3: CUI invalid pentru autocomplete
curl http://localhost:3000/api/settings/autocomplete/abc123

# Așteptat: 400 cu mesaj "CUI invalid"
```

### 2. Testare Rate Limiting

```bash
# Test login limiter (3 încercări / 15 min)
for i in {1..5}; do
  echo "Încercare $i:"
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done

# Așteptat:
# - Primele 3: Status 401 (Unauthorized)
# - Următoarele 2: Status 429 (Too Many Requests)
```

### 3. Testare Error Handling

```bash
# Test 1: Rută inexistentă
curl http://localhost:3000/api/nonexistent

# Așteptat: 404 cu mesaj "Rută /api/nonexistent nu a fost găsită"

# Test 2: Token invalid
curl http://localhost:3000/api/invoices \
  -H "Authorization: Bearer invalid-token"

# Așteptat: 401 cu mesaj "Token invalid"

# Test 3: Factură inexistentă
curl http://localhost:3000/api/invoices/99999 \
  -H "Authorization: Bearer YOUR_VALID_TOKEN"

# Așteptat: 404 cu mesaj "Factură cu ID-ul 99999 nu a fost găsită"
```

### 4. Testare Logging

```bash
# Pornește serverul în terminal separat
cd backend && npm run dev

# În alt terminal, fă câteva request-uri
curl http://localhost:3000/api/auth/me

# Verifică log-urile
tail -f backend/logs/chatbill-$(date +%Y-%m-%d).log

# Ar trebui să vezi:
# - Request-uri HTTP cu status și timing
# - Erori (dacă există)
```

### 5. Testare Paginare

```bash
# Test cu autentificare (înlocuiește YOUR_TOKEN)
TOKEN="your-actual-token-here"

# Test 1: Prima pagină (default)
curl "http://localhost:3000/api/invoices" \
  -H "Authorization: Bearer $TOKEN"

# Așteptat: răspuns cu "pagination": { page: 1, limit: 10, ... }

# Test 2: Pagina 2 cu 5 items
curl "http://localhost:3000/api/invoices?page=2&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Așteptat: răspuns cu "pagination": { page: 2, limit: 5, ... }

# Test 3: Sortare descrescătoare după dată
curl "http://localhost:3000/api/invoices?sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer $TOKEN"

# Test 4: Parametri invalizi (paginare robustă)
curl "http://localhost:3000/api/invoices?page=abc&limit=9999" \
  -H "Authorization: Bearer $TOKEN"

# Așteptat: Validare Zod returnează 400
```

### 6. Verificare ESLint și Prettier

```bash
cd backend

# Test 1: Lint check
npm run lint

# Așteptat: Ar trebui să ruleze fără erori majore

# Test 2: Format check
npm run format:check

# Test 3: Format automat
npm run format

# Test 4: Lint fix automat
npm run lint:fix
```

---

## 🔍 Probleme Potențiale de Verificat

### 1. Environment Variables
```bash
# Verifică că toate variabilele sunt setate
cd backend
cat .env | grep -E "(JWT_SECRET|SESSION_SECRET|DATABASE_URL|STRIPE_)"
```

**Ce ar trebui să existe:**
- `JWT_SECRET` - 64+ caractere
- `SESSION_SECRET` - 64+ caractere
- `DATABASE_URL` - conexiune PostgreSQL
- Stripe keys (dacă folosești payments)

### 2. Prisma Schema
```bash
# Verifică că migrările sunt up-to-date
cd backend
npx prisma migrate status
```

### 3. Log Directory
```bash
# Verifică că directorul logs există și are permisiuni
ls -la backend/logs/

# Dacă nu există, creează-l
mkdir -p backend/logs
```

### 4. Node Modules
```bash
# Verifică că toate pachetele sunt instalate
cd backend
npm list --depth=0 | grep -E "(zod|express-rate-limit|winston)"
```

Ar trebui să vezi:
- ✅ zod@4.1.13
- ✅ express-rate-limit@8.2.1
- ✅ winston@3.19.0
- ✅ winston-daily-rotate-file@5.0.0

---

## 🚀 Quick Start Testing

### Pasul 1: Pregătire
```bash
cd backend
npm install
```

### Pasul 2: Configurare .env
```bash
# Copiază exemplul dacă nu ai .env
cp .env.example .env

# Editează și adaugă JWT_SECRET puternic
echo "JWT_SECRET=$(openssl rand -hex 64)" >> .env
echo "SESSION_SECRET=$(openssl rand -hex 64)" >> .env
```

### Pasul 3: Pornire Server
```bash
# Terminal 1: Server
npm run dev

# Ar trebui să vezi:
# - "Server-ul rulează pe portul 3000"
# - Fără erori la pornire
```

### Pasul 4: Test Rapid
```bash
# Terminal 2: Test basic
curl http://localhost:3000/api/auth/me

# Așteptat: 401 (nu ești autentificat) - corect!

# Test validare
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bad-email","password":"x"}'

# Așteptat: 400 cu erori de validare - perfect!
```

---

## 📋 Checklist Final Înainte de Production

- [ ] **Toate testele de mai sus trec**
- [ ] **ESLint rulează fără erori**
- [ ] **Logging funcționează** (verifică `backend/logs/`)
- [ ] **Rate limiting funcționează** (testează cu multiple requests)
- [ ] **Validarea returnează mesaje clare**
- [ ] **Error handling nu expune stack traces în production**
- [ ] **Paginarea funcționează** (verifică cu mai multe pagini)
- [ ] **.env are secrete puternice** (64+ caractere)
- [ ] **NODE_ENV=production** pentru deploy
- [ ] **CORS permite doar domeniul tău**

---

## 🐛 Probleme Comune și Soluții

### Problema: ESLint nu găsește fișiere
```bash
# Soluție: Verifică glob pattern
npm run lint -- src/**/*.js
```

### Problema: Winston nu creează log-uri
```bash
# Verifică permisiuni
ls -la backend/logs/

# Creează manual dacă lipsește
mkdir -p backend/logs
chmod 755 backend/logs
```

### Problema: Rate limiting nu funcționează local
```bash
# Cauză: Middleware order în server.js
# Asigură-te că rate limiter vine ÎNAINTE de rute
```

### Problema: Validarea Zod nu se aplică
```bash
# Verifică că middleware-ul validate este în rute
# Exemplu: router.post('/create', validateBody(schema), controller)
```

### Problema: Prisma nu găsește baza de date
```bash
# Verifică DATABASE_URL în .env
npx prisma db push
```

---

## 💡 Tips pentru Debugging

### 1. Verifică ordinea middleware-urilor în server.js
```javascript
// Ordinea CORECTĂ:
1. CORS
2. Raw body pentru Stripe webhooks
3. JSON middleware
4. Rate limiting
5. Logging
6. Routes
7. 404 handler
8. Error handler (ULTIMUL!)
```

### 2. Testează cu Postman
Creează o colecție cu:
- Request pentru fiecare endpoint
- Tests automate pentru status codes
- Variables pentru token

### 3. Monitorizează log-urile în timp real
```bash
# Terminal dedicat pentru logs
watch -n 1 'tail -20 backend/logs/chatbill-$(date +%Y-%m-%d).log'
```

---

## ✅ Success Criteria

Proiectul este gata când:

1. ✅ Toate request-urile returnează răspunsuri consistente
2. ✅ Validarea returnează mesaje clare în limba română
3. ✅ Rate limiting blochează după threshold
4. ✅ Log-urile se creează automat în `backend/logs/`
5. ✅ Paginarea returnează metadata corectă
6. ✅ Error-urile nu expun stack traces în production
7. ✅ ESLint și Prettier rulează fără erori

Happy testing! 🎉
