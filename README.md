# ChatBill - Aplicație Web de Chat cu Facturare

O aplicație web modernă de chat care permite generarea automată de facturi pe baza conversațiilor.

## 📋 Caracteristici

- **Chat în timp real** folosind Socket.IO
- **Generare automată de facturi** în format PDF
- **Interfață modernă și responsivă**
- **Gestiune conversații** multiple
- **Istoric facturi** cu descărcare PDF
- **Calcul automat TVA** (19%)

## 🚀 Tehnologii Folosite

### Backend
- Node.js
- Express.js
- Socket.IO (comunicare în timp real)
- PDFKit (generare facturi PDF)
- **Prisma ORM** (gestiune bază de date)
- **PostgreSQL** (bază de date)

### Frontend
- HTML5
- CSS3 (design modern cu gradienți)
- JavaScript vanilla
- Socket.IO Client

## 📁 Structura Proiectului

```
chatbill/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── chatController.js      # Logică chat și conversații
│   │   │   └── invoiceController.js   # Logică generare facturi
│   │   ├── models/
│   │   │   ├── Conversation.js        # Model conversație
│   │   │   ├── Message.js             # Model mesaj
│   │   │   └── Invoice.js             # Model factură
│   │   ├── routes/
│   │   │   ├── chatRoutes.js          # Rute API chat
│   │   │   └── invoiceRoutes.js       # Rute API facturi
│   │   └── server.js                  # Server principal
│   ├── invoices/                      # Facturi PDF generate
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── css/
│   │   └── style.css                  # Stiluri aplicație
│   ├── js/
│   │   └── app.js                     # Logică frontend
│   └── index.html                     # Pagina principală
├── .gitignore
└── README.md
```

## 🛠️ Instalare și Configurare

### 1. Instalare PostgreSQL

**IMPORTANT:** Aplicația necesită PostgreSQL pentru stocare date.

**Opțiuni:**
- **Local:** Instalează PostgreSQL de la [postgresql.org](https://www.postgresql.org/download/)
- **Cloud GRATUIT:** Folosește [Supabase](https://supabase.com) sau [Neon](https://neon.tech)

📖 **Ghid complet:** Vezi fișierul [DATABASE_SETUP.md](./DATABASE_SETUP.md)

### 2. Instalare Dependințe Backend

```bash
cd backend
npm install
```

### 3. Configurare Bază de Date

Copiază fișierul `.env.example` ca `.env`:

```bash
cd backend
copy .env.example .env
```

Editează `.env` și adaugă connection string-ul PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:PAROLA@localhost:5432/chatbill?schema=public"
```

### 4. Inițializare Bază de Date

```bash
cd backend

# Generează Prisma Client
npx prisma generate

# Creează tabelele în PostgreSQL
npx prisma migrate dev --name init
```

### 5. Pornire Server

```bash
cd backend
npm start
```

Pentru development (cu auto-restart):

```bash
npm run dev
```

### 4. Accesare Aplicație

Deschide browserul și accesează:
```
http://localhost:3000
```

## 💡 Cum Funcționează

### 1. Creare/Selectare Companie
- Click pe "**+ Conversație Nouă**"
- **Opțiune A:** Caută companie după **CUI** (dacă există în baza de date, se completează automat)
- **Opțiune B:** Completează manual datele companiei
- **Opțiune C:** Selectează dintr-o companie existentă

### 2. Creare Conversație
- După selectarea companiei, se creează automat o conversație
- Compania este asociată conversației

### 3. Trimitere Mesaje
- Selectează o conversație
- Scrie mesajul în câmpul de input
- Apasă "**Trimite**" sau **Enter**

### 4. Generare Factură
- După ce ai mesaje în conversație
- Click pe "**Generează Factură**" (butonul verde)
- Factura se generează automat cu datele companiei din CUI

### 5. Descărcare Factură
- Click pe orice factură din listă
- PDF-ul se va descărca automat

## 📊 Sistemul de Facturare

### Calcul Preț
- **Preț per mesaj**: 0.50 RON (configurabil în `.env`)
- **TVA**: 19%
- **Formula**: `Total = (Număr mesaje × Preț per mesaj) + TVA`

### Număr Factură
Format: `INV-YYYYMMDD-XXX`
- `YYYY`: An
- `MM`: Lună
- `DD`: Zi
- `XXX`: Număr aleator unic

### Conținut Factură PDF
- Număr factură și dată
- Informații furnizor
- Detalii conversație
- Tabel cu servicii
- Subtotal, TVA și Total

## 🔌 API Endpoints

### Chat

```
POST   /api/chat/conversations              - Creare conversație nouă (cu companyId)
GET    /api/chat/conversations              - Lista conversații
GET    /api/chat/conversations/:id          - Detalii conversație
GET    /api/chat/conversations/:id/messages - Mesaje conversație
```

### Companii (CUI)

```
GET    /api/companies/search/:cui           - Căutare companie după CUI
POST   /api/companies                       - Creare/actualizare companie
GET    /api/companies                       - Lista companii
GET    /api/companies/:id                   - Detalii companie
DELETE /api/companies/:id                   - Ștergere companie
```

### Facturi

```
POST   /api/invoices/generate               - Generare factură
GET    /api/invoices                        - Lista facturi
GET    /api/invoices/:id                    - Detalii factură
GET    /api/invoices/:id/download           - Descărcare PDF
```

### Socket.IO Events

```javascript
// Client → Server
socket.emit('joinConversation', conversationId)
socket.emit('sendMessage', messageData)

// Server → Client
socket.on('message', messageData)
socket.on('invoiceGenerated', invoiceData)
```

## 🎨 Personalizare

### Schimbare Culori
Editează `frontend/css/style.css`:

```css
/* Gradientul principal */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Buton principal */
.btn-primary {
    background: #667eea;
}
```

### Modificare Prețuri
Editează `backend/.env`:

```env
PRICE_PER_MESSAGE=0.75
TVA_RATE=0.19
```

## 📝 To-Do / Funcționalități Viitoare

- [x] Bază de date persistentă PostgreSQL cu Prisma ORM
- [x] Gestiune companii cu căutare după CUI
- [x] Asociere conversații cu companii
- [ ] Integrare API ANAF pentru date companii automate din CUI
- [ ] Autentificare utilizatori
- [ ] Export facturi în format Excel
- [ ] Email automat pentru facturi
- [ ] Dashboard statistici
- [ ] Chat cu AI (integrare ChatGPT)
- [ ] Plăți online integrate
- [ ] Multi-tenancy (mai multe companii)

## 🔧 Comenzi Utile

### Prisma/Database

```powershell
# Vizualizare date în browser
npx prisma studio

# Reset baza de date
npx prisma migrate reset

# Creare migrație nouă
npx prisma migrate dev --name nume_migratie
```

### Development

```powershell
# Pornire cu auto-reload
npm run dev

# Pornire normală
npm start
```

## 🐛 Debugging

### Server nu pornește
```bash
# Verifică dacă portul 3000 este ocupat
netstat -ano | findstr :3000

# Schimbă portul în .env
PORT=3001
```

### Eroare conexiune bază de date
```bash
# Verifică că PostgreSQL rulează
# Windows Services > PostgreSQL

# Testează conexiunea
cd backend
npx prisma db pull

# Verifică DATABASE_URL în .env
```

### Chat nu funcționează
- Verifică consola browserului (F12)
- Asigură-te că server-ul rulează
- Verifică că Socket.IO se conectează

### Facturi nu se generează
- Verifică directorul `backend/invoices/` există
- Verifică permisiunile de scriere
- Verifică logs-urile serverului

## 📄 Licență

ISC

## 👨‍💻 Autor

ChatBill Team

## 🤝 Contribuții

Contribuțiile sunt binevenite! Deschide un issue sau un pull request.

---

**Notă**: Aceasta este o versiune demo. Pentru producție, adaugă:
- Bază de date reală
- Sistem de autentificare
- Validare avansată
- Rate limiting
- Backup-uri automate
