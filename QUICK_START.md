# ⚡ ChatBill - Quick Start Guide

## 🚀 Start în 3 Pași (Fără Cont)

### Pas 1: Setări Companie (2 minute)

1. **Deschide aplicația** → `http://localhost:3000`
2. Click pe **⚙️ Setări** din sidebar
3. **Auto-completare ANAF**:
   - Introdu CUI-ul companiei tale
   - Click **🔍 Auto-completare**
   - Datele se completează automat din ANAF!

4. **Completează restul**:
   - Date bancare (IBAN, Bancă)
   - Contact (Email, Telefon)
   - Capital social

5. Click **💾 Salvează** → Setările rămân în browser!

---

### Pas 2: Generează Prima Factură (1 minut)

1. Click pe **📄 Facturi** → **Generare**
2. **Date Client**:
   - Bifează **□ Persoană fizică** sau lasă **Companie**
   - Completează CUI/CNP, nume, adresă

3. **Produse/Servicii**:
   - Adaugă produse cu **+ Adaugă produs**
   - Completează: Denumire, Cantitate, Preț, TVA
   - Totalul se calculează automat!

4. **Template PDF**:
   - Alege unul din cele 4 template-uri:
     - 🎨 Modern
     - 📋 Classic
     - ⚪ Minimal
     - ✨ Elegant

5. Click **✨ Generează Factură**

---

### Pas 3: Descarcă PDF (10 secunde)

1. Va apărea mesaj: **"✅ Factură FAC-0001 generată cu succes!"**
2. Click **OK** pentru download automat
3. PDF-ul se descarcă instant!
4. Gata! 🎉

---

## 🎯 Tips & Tricks

### ⚡ Generare Ultra-Rapidă

**După prima configurare**, generarea unei facturi durează < 30 secunde:

```
1. Click "Facturi" → "Generare"     (2s)
2. Completează date client          (15s)
3. Adaugă 1-3 produse               (10s)
4. Click "Generează"                (2s)
5. Download automat                 (1s)
───────────────────────────────────────
TOTAL: ~30 secunde ⚡
```

### 🔍 Auto-completare ANAF

**Magic!** Nu mai scrii manual datele companiilor:

1. Ai doar CUI-ul clientului? Perfect!
2. Introdu CUI → Auto-completare
3. Toate datele se completează singure
4. Funcționează pentru:
   - Date companie emitentă (tu)
   - Date client (dacă faci feature în viitor)

### 📋 Template-uri - Când le folosești?

| Template | Când să-l folosești |
|----------|---------------------|
| 🎨 **Modern** | Afaceri tech, creative, startup-uri |
| 📋 **Classic** | Companii tradiționale, B2B corporate |
| ⚪ **Minimal** | Freelanceri, servicii de consultanță |
| ✨ **Elegant** | Branduri premium, luxury, lifestyle |

### 💡 Setări TVA

**Ești plătitor de TVA?**
- ✅ **DA** → Lasă bifat "Plătitor de TVA" (19%)
- ❌ **NU** → Debifează → TVA = 0%

**Cotă TVA diferită?**
- Schimbă din "19%" în altă cotă (5%, 9%, etc.)

---

## 🆚 Fără Cont vs Cu Cont

### ✅ Fără Cont (Public)

**Funcționează:**
- ✅ Generare facturi, proforma, oferte
- ✅ Toate cele 4 template-uri PDF
- ✅ Auto-completare ANAF
- ✅ Setări salvate în browser
- ✅ Download instant PDF

**Nu funcționează:**
- ❌ Istoric documente
- ❌ Backup cloud
- ❌ Sincronizare între dispozitive
- ❌ Trimitere automată email
- ❌ Integrare ANAF e-Factura
- ❌ Chat AI pentru generare conversațională

### 🔐 Cu Cont (Premium Features)

**Tot ce e la "Fără Cont" +:**
- ✅ **Istoric complet** - vezi toate documentele
- ✅ **Backup cloud** - datele tale sunt sigure
- ✅ **Sincronizare** - același cont pe PC, mobile, tabletă
- ✅ **Email automat** - trimite factura direct la client
- ✅ **ANAF e-Factura** - trimitere automată la ANAF
- ✅ **Chat AI** - generează facturi conversațional
- ✅ **WhatsApp Business** - integrare directă
- ✅ **Rapoarte** - statistici și dashboard

---

## 🛠️ Rezolvare Probleme Rapide

### ❌ "Completați datele companiei în secțiunea Setări"

**Cauză:** Nu ai salvat setările companiei emitente.

**Soluție:**
1. Mergi la ⚙️ Setări → Date Companie
2. Completează minim: CUI, Nume, Adresă
3. Click 💾 Salvează
4. Încearcă din nou

---

### ❌ "Token de autentificare lipsește"

**Cauză:** Încerci să accesezi o funcție care necesită cont (ex: istoric).

**Soluție:**
- Funcțiile publice (generare documente) funcționează fără token
- Pentru istoric, statistici, etc. → Creează un cont gratuit

---

### ❌ PDF-ul nu se descarcă

**Cauză:** Browser blochează pop-up-uri.

**Soluție:**
1. Permite pop-up-uri pentru `localhost:3000`
2. Sau: Click manual pe link-ul de download din mesaj

---

### ❌ "Companie negăsită în ANAF"

**Cauză:** CUI-ul nu există sau nu e valid.

**Soluție:**
- Verifică dacă ai scris corect CUI-ul (fără RO)
- Ex: `12345678` ✅ (nu `RO12345678`)
- Dacă tot nu merge, completează manual

---

## 📱 Keyboard Shortcuts

| Shortcut | Acțiune |
|----------|---------|
| `Tab` | Navighează între câmpuri |
| `Enter` (pe formular) | Salvează/Generează |
| `Ctrl + S` | Salvează setări (în pagina setări) |
| `Esc` | Închide modal-uri |

---

## 🎓 Tutorial Video (Imaginează-ți)

```
[ ] Pas 1: Configurare Setări (0:00 - 2:00)
[ ] Pas 2: Prima Factură (2:00 - 3:30)
[ ] Pas 3: Template-uri PDF (3:30 - 4:30)
[ ] Pas 4: Auto-completare ANAF (4:30 - 5:30)
[ ] Pas 5: Creare Cont (Opțional) (5:30 - 7:00)

DURATĂ TOTALĂ: 7 minute
```

---

## 💼 Use Cases Reale

### 1. **Freelancer IT**
"Lucrez cu 3-4 clienți pe lună. Nu vreau complicații."

**Soluție:**
- Setezi datele tale o dată
- Generezi factura în < 1 minut per client
- Descarci PDF și trimiți pe email manual
- **FĂRĂ CONT** - Perfect! ✅

---

### 2. **Startup în creștere**
"Am 10-20 de facturi pe lună. Vreau să țin evidența."

**Soluție:**
- Creezi cont gratuit
- Vezi istoricul complet
- Export rapoarte lunare
- Backup automat
- **CU CONT** - Recomandat! 👍

---

### 3. **Companie Mare**
"100+ facturi/lună + integrare ANAF obligatorie."

**Soluție:**
- Cont cu abonament
- ANAF e-Factura automat
- Integrare WhatsApp pentru clienți
- Chat AI pentru procesare comenzi
- **PREMIUM** - Necesar! 🚀

---

## 🎉 Recap Final

**ChatBill este simplu:**

1. 🔧 **Configurezi** → Setări companie (1x)
2. 📄 **Generezi** → Facturi instant (30s/factură)
3. 💾 **Descarci** → PDF profesional imediat

**Fără cont? Perfect pentru:**
- Freelanceri
- Utilizatori ocazionali
- Testing înainte de înregistrare

**Cu cont? Ideal pentru:**
- Companii cu volum mare
- Istoric și rapoarte
- Integrări avansate (ANAF, email, WhatsApp)

---

**Întrebări?** → support@chatbill.ro

**Gata de primul tău PDF?** → [Generează prima factură](http://localhost:3000) 🚀
