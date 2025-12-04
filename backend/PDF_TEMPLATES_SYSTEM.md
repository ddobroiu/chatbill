# Sistem de Template-uri PDF pentru Facturi - ChatBill

## Prezentare Generală

ChatBill oferă 4 template-uri profesionale de PDF pentru facturi, fiecare cu un design distinct și atractiv. Toate template-urile suportă **diacritice românești complete** (ă, â, î, ș, ț) prin fonturile Roboto.

---

## Template-uri Disponibile

### 1. **MODERN** (default)
- **Stil**: Gradient colorat, aspect tech startup
- **Culori**: 
  - Primar: Purple (#667eea)
  - Secundar: Purple închis (#764ba2)
  - Accent: Pink (#f093fb)
- **Caracteristici**:
  - Header cu gradient purple/pink
  - Tabel cu rânduri alternate (striped)
  - Design colorat și modern
  - Perfect pentru companii tech, startup-uri, agenții creative

### 2. **CLASSIC**
- **Stil**: Corporate profesional, tradițional business
- **Culori**:
  - Primar: Navy (#2c3e50)
  - Secundar: Gray-blue (#34495e)
  - Accent: Blue (#3498db)
- **Caracteristici**:
  - Layout cu border-uri și cutii
  - Design sobru și profesional
  - Tabel cu celule încadrate
  - Perfect pentru firme corporative, servicii profesionale, consultanță

### 3. **MINIMAL**
- **Stil**: Clean, minimalist, contemporan
- **Culori**:
  - Primar: Black (#000000)
  - Secundar: Dark gray (#333333)
  - Accent: Medium gray (#666666)
- **Caracteristici**:
  - Design extrem de simplu
  - Doar linii subțiri, fără fundal
  - Spațiu alb generos
  - Perfect pentru arhitecți, designeri, servicii premium cu estetică minimalistă

### 4. **ELEGANT**
- **Stil**: Premium, luxos, raffinat
- **Culori**:
  - Primar: Brown (#8b4513)
  - Secundar: Sienna (#a0522d)
  - Accent: Gold (#daa520)
- **Caracteristici**:
  - Border-uri decorative aurii
  - Design premium cu accente gold
  - Aspect de lux
  - Perfect pentru boutique-uri, servicii de lux, brand-uri premium

---

## Utilizare

### 1. Creare Factură cu Template

**Endpoint**: `POST /api/invoices`

**Body**:
```json
{
  "client": {
    "type": "company",
    "name": "S.C. CLIENT EXEMPLU S.R.L.",
    "cui": "RO12345678",
    "regCom": "J40/1234/2020",
    "address": "Str. Exemplu nr. 1",
    "city": "București",
    "county": "București"
  },
  "products": [
    {
      "name": "Servicii de consultanță",
      "quantity": 10,
      "price": 500,
      "unit": "ore",
      "vat": 19
    }
  ],
  "template": "modern"
}
```

**Parametru `template`**:
- Valori posibile: `"modern"`, `"classic"`, `"minimal"`, `"elegant"`
- Default: `"modern"` (dacă nu este specificat)

---

## Caracteristici Tehnice

### Suport Diacritice Românești

Toate template-urile folosesc **fonturile Roboto** care suportă complet:
- ă, Ă
- â, Â
- î, Î
- ș, Ș
- ț, Ț

Fonturile sunt încărcate automat din `backend/assets/fonts/`:
- `Roboto-Regular.ttf` - text normal
- `Roboto-Bold.ttf` - text bold
- `Roboto-Italic.ttf` - text italic
- `Roboto-Medium.ttf` - text medium weight
- `Roboto-Light.ttf` - text light weight

### Fallback

Dacă fonturile Roboto nu pot fi încărcate, sistemul folosește automat **Helvetica** (built-in PDFKit).

---

## Structura PDF-ului

Fiecare template include:

### 1. **Header/Antet**
- Nume companie emitentă
- CUI, Reg. Com.
- Adresă completă (oraș, județ)
- Date de contact (telefon, email)

### 2. **Informații Factură**
- Număr factură (ex: FAC-2024-001)
- Data emiterii
- Data scadenței

### 3. **Date Client**
- Nume/Denumire
- CUI/CNP (în funcție de tip: companie/persoană fizică)
- Reg. Com. (pentru companii)
- Adresă completă

### 4. **Tabel Produse/Servicii**

Coloane:
- Nr. crt. / Denumire produs/serviciu
- Unitate de măsură (buc, ore, kg, etc.)
- Cantitate
- Preț unitar (RON)
- TVA (%)
- Total (RON)

### 5. **Totaluri**
- **Subtotal** (fără TVA)
- **TVA** (calculat la 21%)
- **TOTAL DE PLATĂ** (bold, evidențiat)

### 6. **Date Bancare** (opțional)
- Banca
- IBAN

### 7. **Footer**
- "Document generat cu ChatBill"
- Data și ora generării

---

## Exemple de Utilizare

### Template Modern (Startup Tech)
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "template": "modern",
    "client": {...},
    "products": [...]
  }'
```

### Template Classic (Firmă de Consultanță)
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "template": "classic",
    "client": {...},
    "products": [...]
  }'
```

### Template Minimal (Arhitectură)
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "template": "minimal",
    "client": {...},
    "products": [...]
  }'
```

### Template Elegant (Boutique Lux)
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "template": "elegant",
    "client": {...},
    "products": [...]
  }'
```

---

## Testare Template-uri

### 1. Crează factură de test cu fiecare template:

**Modern**:
```javascript
const response = await fetch('http://localhost:3000/api/invoices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template: 'modern',
    client: {
      type: 'company',
      name: 'S.C. TECH SOLUTIONS S.R.L.',
      cui: 'RO12345678',
      address: 'Str. Tehnologiei nr. 5',
      city: 'Cluj-Napoca',
      county: 'Cluj'
    },
    products: [
      { name: 'Dezvoltare aplicație mobilă', quantity: 1, price: 5000, unit: 'buc', vat: 19 }
    ]
  })
});
```

### 2. Descarcă PDF-ul generat:

```javascript
const invoice = await response.json();
window.open(`http://localhost:3000/api/invoices/${invoice.invoice.id}/pdf`);
```

---

## Integrare Frontend

### Selector de Template în UI

```html
<select name="template" id="template-selector">
  <option value="modern">Modern (Gradient Purple/Pink)</option>
  <option value="classic">Classic (Corporate Blue)</option>
  <option value="minimal">Minimal (Clean Black/White)</option>
  <option value="elegant">Elegant (Premium Brown/Gold)</option>
</select>
```

### Preview Template-uri

Consideră adăugarea de thumbnail-uri pentru fiecare template:

```
/assets/templates/
  ├── modern-preview.png
  ├── classic-preview.png
  ├── minimal-preview.png
  └── elegant-preview.png
```

---

## Database Schema

Câmp adăugat în modelul `Invoice`:

```prisma
model Invoice {
  // ... alte câmpuri
  template String @default("modern")
}
```

**Migrație aplicată**: `20251204055641_add_invoice_template`

---

## Fișiere Implicate

### Backend
- `backend/src/services/pdfTemplates.js` - Rendering template-uri (4076 linii)
- `backend/src/controllers/invoiceController.js` - Logic creare facturi
- `backend/assets/fonts/` - Fonturile Roboto (20 fișiere .ttf)
- `backend/prisma/schema.prisma` - Schema DB cu câmp template

### Dependențe NPM
- `pdfkit` - Generare PDF
- `pdfkit-table` - Suport tabele avansate
- `@pdf-lib/fontkit` - Suport fonturi custom

---

## Troubleshooting

### Fonturile nu se încarcă

**Simptom**: Warning în consolă "Nu s-au putut înregistra fonturile Roboto"

**Soluție**:
```bash
cd backend/assets/fonts
# Verifică dacă există fișierele .ttf
ls Roboto-*.ttf
```

**Re-descarcă fonturile**:
```bash
Invoke-WebRequest -Uri "https://github.com/google/roboto/releases/download/v2.138/roboto-unhinted.zip" -OutFile "roboto.zip"
Expand-Archive -Path "roboto.zip" -DestinationPath "." -Force
Remove-Item "roboto.zip"
```

### Diacritice nu apar corect

**Cauză**: Fonturile Helvetica (fallback) au suport limitat pentru diacritice

**Soluție**: Asigură-te că Roboto se încarcă corect (vezi mai sus)

### Template nu se aplică

**Verifică**:
1. Parametrul `template` este trimis în request body
2. Valoarea este una din: `modern`, `classic`, `minimal`, `elegant`
3. Migrația DB a fost aplicată (`npx prisma migrate deploy`)

---

## Personalizare

### Adaugă un template nou

1. **Definește culori** în `pdfTemplates.js`:
```javascript
const COLORS = {
  // ... alte template-uri
  myTemplate: {
    primary: '#color1',
    secondary: '#color2',
    accent: '#color3',
    text: '#color4',
    lightGray: '#color5',
    border: '#color6'
  }
};
```

2. **Crează funcția de render**:
```javascript
function renderMyTemplate(doc, invoice, companySettings) {
  const colors = COLORS.myTemplate;
  const useRoboto = registerFonts(doc);
  const regularFont = useRoboto ? 'Roboto' : 'Helvetica';
  const boldFont = useRoboto ? 'Roboto-Bold' : 'Helvetica-Bold';
  
  // ... logica de rendering
}
```

3. **Adaugă în switch** (`invoiceController.js`):
```javascript
case 'myTemplate':
  renderMyTemplate(doc, invoiceData, companySettings);
  break;
```

4. **Actualizează schema Prisma** (dacă vrei validare):
```prisma
template String @default("modern") // values: modern, classic, minimal, elegant, myTemplate
```

---

## Roadmap Viitor

- [ ] Preview template-uri în frontend (thumbnail-uri)
- [ ] Editor vizual de template-uri
- [ ] Customizare culori per companie
- [ ] Template-uri cu logo companie
- [ ] Export PDF în alte limbi (EN, FR, DE)
- [ ] Template pentru oferte de preț
- [ ] Template pentru chitanțe

---

## Contacte & Suport

Pentru întrebări sau probleme legate de sistemul de template-uri PDF:
- GitHub Issues: [repository link]
- Email: support@chatbill.com

---

**Versiune**: 1.0.0  
**Data ultimei actualizări**: 4 decembrie 2024  
**Autor**: ChatBill Team
