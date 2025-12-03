# Setup Bază de Date PostgreSQL pentru ChatBill

## Opțiune 1: Instalare PostgreSQL Local

### Windows

1. **Descarcă PostgreSQL** de la: https://www.postgresql.org/download/windows/
2. **Instalează PostgreSQL** (alege versiunea 15 sau mai nouă)
3. **Notează parola** pentru utilizatorul `postgres`

4. **Creează baza de date:**
```powershell
# Deschide PowerShell și rulează:
psql -U postgres

# În consola PostgreSQL:
CREATE DATABASE chatbill;
\q
```

### Configurare .env

Creează fișierul `.env` în directorul `backend/`:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:PAROLA_TA@localhost:5432/chatbill?schema=public"

# Configurare companie pentru facturi
COMPANY_NAME=ChatBill SRL
COMPANY_CUI=RO12345678
COMPANY_ADDRESS=Str. Exemplu Nr. 1, București
COMPANY_EMAIL=contact@chatbill.ro
COMPANY_PHONE=+40 123 456 789

# Prețuri
PRICE_PER_MESSAGE=0.50
TVA_RATE=0.19
```

**IMPORTANT:** Înlocuiește `PAROLA_TA` cu parola ta PostgreSQL!

## Opțiune 2: PostgreSQL în Cloud (GRATUIT)

### Supabase (Recomandat - GRATUIT)

1. Mergi pe: https://supabase.com
2. Creează cont gratuit
3. Creează un nou proiect
4. Copiază **Connection String** din Settings > Database
5. Adaugă în `.env`:

```env
DATABASE_URL="postgresql://postgres:[PAROLA]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Neon (Alternativă GRATUITĂ)

1. Mergi pe: https://neon.tech
2. Creează cont gratuit
3. Creează un database
4. Copiază connection string în `.env`

## Pași pentru inițializare bază de date

După ce ai configurat PostgreSQL și `.env`:

```powershell
# 1. Navighează în backend
cd backend

# 2. Instalează dependențele (dacă nu ai făcut deja)
npm install

# 3. Generează Prisma Client
npx prisma generate

# 4. Rulează migrațiile (creează tabelele)
npx prisma migrate dev --name init

# 5. (Opțional) Deschide Prisma Studio pentru a vizualiza datele
npx prisma studio
```

## Verificare Instalare

```powershell
# Test conexiune la baza de date
cd backend
npx prisma db pull
```

Dacă nu apare eroare, conexiunea funcționează! ✅

## Comenzi Utile Prisma

```powershell
# Generează client după modificarea schema.prisma
npx prisma generate

# Creează migrație nouă
npx prisma migrate dev --name nume_migratie

# Reset baza de date (ȘTERGE TOATE DATELE!)
npx prisma migrate reset

# Vizualizare date în browser
npx prisma studio

# Verificare status
npx prisma migrate status
```

## Troubleshooting

### Eroare: "Can't reach database server"
- Verifică că PostgreSQL rulează
- Windows: Services > PostgreSQL
- Verifică parola în `.env`

### Eroare: "Database does not exist"
```powershell
psql -U postgres
CREATE DATABASE chatbill;
```

### Eroare: "Authentication failed"
- Verifică parola în `DATABASE_URL`
- Asigură-te că user-ul `postgres` există

### Port 5432 ocupat
```powershell
# Verifică ce proces folosește portul
netstat -ano | findstr :5432

# Schimbă portul în PostgreSQL sau folosește cloud database
```

## Structura Bazei de Date

Aplicația va crea automat următoarele tabele:

- **Company** - Companiile clienților (căutare după CUI)
- **User** - Utilizatori (opțional, pentru viitor)
- **Conversation** - Conversații de chat
- **Message** - Mesajele din conversații
- **Invoice** - Facturile generate

## Date Demo (Opțional)

Pentru a adăuga date demo:

```powershell
npx prisma studio
```

Apoi adaugă manual câteva companii cu CUI-uri reale.

---

**Gata!** Acum poți porni serverul:

```powershell
cd backend
npm start
```

Aplicația va fi conectată la PostgreSQL! 🚀
