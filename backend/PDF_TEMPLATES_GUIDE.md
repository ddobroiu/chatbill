# 📄 Ghid Template-uri PDF Premium

## 🎨 Template-uri Disponibile

### 1. **Modern Minimalist** (Stripe-style)
- Design clean, aerisit
- Multe spații albe
- Borduri subtiri
- Perfect pentru SaaS/tech companies

### 2. **Professional Clean** (Vercel-style)
- Header cu gradient
- Secțiuni distincte cu background
- Look modern și profesional
- Perfect pentru corporate

---

## 🚀 Utilizare

### Preview în Browser (HTML)

**Endpoint:** `POST /api/invoices/preview`

```javascript
// Request
POST http://localhost:3000/api/invoices/preview
Content-Type: application/json

{
  "invoice": {
    "invoiceNumber": "FAC000001",
    "issueDate": "13.12.2025",
    "status": "paid"
  },
  "company": {
    "name": "Tech Solutions SRL",
    "cui": "RO12345678",
    "regCom": "J40/1234/2025",
    "address": "Str. Exemplu Nr. 10",
    "city": "București",
    "county": "București",
    "phone": "+40 721 234 567",
    "email": "contact@techsolutions.ro",
    "iban": "RO49AAAA1B31007593840000",
    "bank": "BCR",
    "isVatPayer": true,
    "vatRate": 21
  },
  "client": {
    "type": "company",
    "name": "Client Company SRL",
    "cui": "RO87654321",
    "address": "Str. Client Nr. 20",
    "city": "Cluj-Napoca",
    "county": "Cluj"
  },
  "products": [
    {
      "name": "Servicii dezvoltare web",
      "unit": "luni",
      "quantity": 1,
      "price": 5000,
      "vat": 19
    },
    {
      "name": "Hosting cloud",
      "unit": "luni",
      "quantity": 12,
      "price": 50,
      "vat": 19
    }
  ],
  "template": "modern-minimal"
}
```

**Răspuns:** HTML complet (deschis în browser)

---

### Download PDF

**Endpoint:** `POST /api/invoices/generate-pdf`

```javascript
// Request (aceleași date ca mai sus)
POST http://localhost:3000/api/invoices/generate-pdf
Content-Type: application/json

{
  ... // Same JSON as preview
  "template": "professional-clean"
}
```

**Răspuns:** PDF file download

---

### Preview factură din baza de date

**Endpoint:** `GET /api/invoices/:id/preview?template=modern-minimal`

```javascript
// Necesită autentificare
GET http://localhost:3000/api/invoices/123/preview?template=modern-minimal
Authorization: Bearer YOUR_TOKEN
```

---

### Download PDF factură din baza de date

**Endpoint:** `GET /api/invoices/:id/pdf?template=professional-clean`

```javascript
// Necesită autentificare
GET http://localhost:3000/api/invoices/123/pdf?template=professional-clean
Authorization: Bearer YOUR_TOKEN
```

---

## 🎯 Integrare în Frontend

### Exemple în JavaScript

```javascript
// 1. Preview în browser (new window)
async function previewInvoice(invoiceData, template = 'modern-minimal') {
  const response = await fetch('http://localhost:3000/api/invoices/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...invoiceData,
      template
    })
  });

  const html = await response.text();
  const previewWindow = window.open('', '_blank');
  previewWindow.document.write(html);
  previewWindow.document.close();
}

// 2. Download PDF direct
async function downloadInvoicePDF(invoiceData, template = 'modern-minimal') {
  const response = await fetch('http://localhost:3000/api/invoices/generate-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...invoiceData,
      template
    })
  });

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Factura_${invoiceData.invoice.invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// 3. Template Selector
function selectTemplate() {
  const template = document.getElementById('template-selector').value;
  // 'modern-minimal' sau 'professional-clean'
  return template;
}
```

---

## 📦 Template Selector în HTML

```html
<select id="template-selector" class="form-control">
  <option value="modern-minimal">Modern Minimalist (Stripe)</option>
  <option value="professional-clean">Professional Clean (Vercel)</option>
</select>

<button onclick="previewInvoice(invoiceData, selectTemplate())">
  Preview în Browser
</button>

<button onclick="downloadInvoicePDF(invoiceData, selectTemplate())">
  Download PDF
</button>
```

---

## ⚙️ Configurare

### Fontul Inter
Template-urile folosesc **Google Fonts** pentru Inter. Pentru self-hosting:

1. Download Inter font de la [Google Fonts](https://fonts.google.com/specimen/Inter)
2. Adaugă în `backend/templates/fonts/Inter/`
3. Update `<link>` în template-uri cu path local

### Puppeteer în producție

**Deployment pe VPS/Dedicated:**
```bash
# Puppeteer include Chromium automat
npm install puppeteer
```

**Deployment serverless (Vercel/Netlify):**
```bash
# Folosește chrome-aws-lambda
npm install chrome-aws-lambda puppeteer-core
```

---

## 🔧 Personalizare Template

### Adaugă un template nou:

1. Creează directorul:
```bash
mkdir backend/templates/my-custom-template
```

2. Creează `invoice.ejs`:
```html
<!DOCTYPE html>
<html>
  <!-- Custom template HTML -->
</html>
```

3. Înregistrează template-ul în `pdfService.js`:
```javascript
this.templates = {
  'modern-minimal': path.join(__dirname, '../templates/modern-minimal/invoice.ejs'),
  'professional-clean': path.join(__dirname, '../templates/professional-clean/invoice.ejs'),
  'my-custom-template': path.join(__dirname, '../templates/my-custom-template/invoice.ejs')
};
```

---

## 📊 Variabile disponibile în template

```javascript
{
  invoice: {
    invoiceNumber: string,
    issueDate: string,
    dueDate: string,
    status: 'paid' | 'unpaid',
    isVatPayer: boolean,
    subtotal: number,
    totalVat: number,
    total: number
  },
  company: {
    name: string,
    cui: string,
    regCom: string,
    address: string,
    city: string,
    county: string,
    phone: string,
    email: string,
    iban: string,
    bank: string,
    logo: string | null
  },
  client: {
    type: 'company' | 'individual',
    name: string,           // pentru company
    firstName: string,      // pentru individual
    lastName: string,       // pentru individual
    cui: string,
    cnp: string,
    address: string,
    city: string,
    county: string
  },
  products: [
    {
      name: string,
      unit: string,
      quantity: number,
      price: number,
      vat: number
    }
  ]
}
```

---

## 🎨 Design Guidelines

### Modern Minimalist
- Font: Inter 400/500/600/700
- Colors: gray-900 (text), gray-500 (secondary), gray-200 (borders)
- Spacing: generous padding (py-5, mb-12)
- Tables: borderless, subtle dividers

### Professional Clean
- Font: Inter 400/500/600/700
- Colors: gradient header (purple), gray backgrounds
- Spacing: compact but readable
- Cards: rounded corners, shadows

---

## 🚨 Troubleshooting

### PDF-ul arată diferit de preview
- **Cauză:** Fonturi neîncărcate
- **Soluție:** Verifică că Google Fonts sunt accesibile sau folosește self-hosted fonts

### Puppeteer timeout
- **Cauză:** Server supraîncărcat
- **Soluție:** Crește timeout în `pdfService.js`:
```javascript
await page.setContent(html, {
  waitUntil: 'networkidle0',
  timeout: 60000 // 60 seconds
});
```

### Eroare "browser not found"
- **Cauză:** Chromium lipsă
- **Soluție:**
```bash
npm install puppeteer --force
```

---

## 📝 Licență & Credite

Template-uri create pentru ChatBill
Design inspirat de: Stripe, Vercel
Font: Inter by Rasmus Andersson
