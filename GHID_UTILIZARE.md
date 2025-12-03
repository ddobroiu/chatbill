# ChatBill - Sistem Inteligent de Facturare

## ✅ Integrare Completă cu Baza de Date

### 🎯 Ce am implementat:

#### 1. **Baza de Date SQLite**
- ✅ Configurată și migrată cu Prisma ORM
- ✅ Fișier bază de date: `backend/prisma/dev.db`
- ✅ Nu necesită PostgreSQL instalat
- ✅ Perfect pentru dezvoltare și testare

#### 2. **Schema Bază de Date**
- ✅ **Company** - Companii/clienți
- ✅ **Invoice** - Facturi complete
- ✅ **InvoiceItem** - Produse/servicii pe factură
- ✅ **User** - Utilizatori (pentru viitor)
- ✅ **Conversation** - Conversații chat (pentru viitor)
- ✅ **Message** - Mesaje (pentru viitor)

#### 3. **Funcționalități Facturare**
- ✅ Generare factură cu date emitent din setări
- ✅ Date client din ANAF sau manual
- ✅ Suport persoane fizice (CNP) și juridice (CUI)
- ✅ Produse/servicii multiple pe factură
- ✅ Calcul automat TVA și totaluri
- ✅ Generare PDF profesional
- ✅ Stocare în baza de date
- ✅ Descărcare PDF

---

## 🚀 Pornire Aplicație

### Backend:
```bash
cd backend
npm run dev
```

Server pornește pe: **http://localhost:3000**

### Frontend:
Deschide în browser: **http://localhost:3000**

---

## 📋 Cum Folosești Aplicația

### 1. **Configurează-ți Compania (Tab "Setări Companie")**
   - Introdu CUI-ul companiei tale
   - Apasă "Caută și Completează" pentru auto-completare din ANAF
   - Completează datele bancare (IBAN, Bancă)
   - Salvează setările

### 2. **Generează Facturi (Tab "Generare Factură")**
   
   **Pasul 1: Date Client**
   - Caută client după CUI (auto-completare ANAF)
   - SAU bifează "Persoană fizică" pentru CNP
   - Completează manual dacă e necesar

   **Pasul 2: Produse/Servicii**
   - Denumire produs/serviciu
   - Unitate măsură (buc, kg, ora, etc.)
   - Cantitate și preț unitar
   - Selectează cota TVA (0%, 5%, 9%, 19%)
   - Adaugă mai multe produse cu "+Adaugă Produs"

   **Pasul 3: Generare**
   - Apasă "Generează Factură"
   - Factură salvată în baza de date
   - PDF generat automat
   - Opțiune de descărcare

---

## 🗄️ Structură Bază de Date

### Invoice (Facturi)
```
- ID unic
- Număr factură (20251203XXXX)
- Date emitent (nume, CUI, adresă, IBAN, etc.)
- Date client/beneficiar
- Subtotal, TVA, Total
- Status (generated, sent, paid, cancelled)
- Cale PDF
- Timestamp-uri
```

### InvoiceItem (Produse pe Factură)
```
- ID unic
- Link către factură
- Denumire produs/serviciu
- Unitate măsură
- Cantitate
- Preț unitar
- Cota TVA
- Subtotal, TVA, Total calculate
```

---

## 📊 API Endpoints

### Facturi
- `POST /api/invoices/create` - Creează factură nouă
- `GET /api/invoices` - Lista toate facturile
- `GET /api/invoices/:id` - Detalii factură
- `GET /api/invoices/:id/download` - Descarcă PDF

### Setări
- `GET /api/settings` - Obține setări companie
- `PUT /api/settings` - Actualizează setări
- `GET /api/settings/autocomplete/:cui` - Auto-completare din ANAF

### Companii (ANAF)
- `GET /api/companies/search/:cui` - Caută companie după CUI

---

## 📂 Locație Fișiere

- **Bază de date**: `backend/prisma/dev.db`
- **PDF-uri generate**: `backend/invoices/*.pdf`
- **Migrări Prisma**: `backend/prisma/migrations/`

---

## 🎨 Caracteristici

### ✅ Implementate:
- Auto-completare companii din ANAF (iApp API)
- Setări companie emitentă
- Generare facturi cu produse multiple
- Calcul automat TVA
- PDF-uri profesionale
- Salvare în bază de date SQLite
- Suport persoane fizice și juridice

---

**Baftă la facturare!** 🚀
