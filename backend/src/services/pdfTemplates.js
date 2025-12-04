const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Functie helper pentru a inlocui diacritice romanesti cu echivalente ASCII
function removeDiacritics(text) {
  if (!text) return '';
  return text
    .replace(/ă/g, 'a').replace(/Ă/g, 'A')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .replace(/î/g, 'i').replace(/Î/g, 'I')
    .replace(/ș/g, 's').replace(/Ș/g, 'S')
    .replace(/ț/g, 't').replace(/Ț/g, 'T');
}

// Funcție helper pentru înregistrarea fonturilor - folosește fonturile standard PDFKit
function registerFonts(doc) {
  // Folosim Helvetica standard
  console.log('✅ Folosim fonturile standard Helvetica (fara diacritice)');
  return false;
}

// Culori pentru template-uri
const COLORS = {
  modern: {
    primary: '#0052cc',
    secondary: '#0747a6',
    accent: '#00b8d9',
    text: '#172b4d',
    lightGray: '#f4f5f7',
    border: '#dfe1e6'
  },
  classic: {
    primary: '#2c3e50',
    secondary: '#34495e',
    accent: '#3498db',
    text: '#2c3e50',
    lightGray: '#ecf0f1',
    border: '#bdc3c7'
  },
  minimal: {
    primary: '#000000',
    secondary: '#333333',
    accent: '#666666',
    text: '#000000',
    lightGray: '#f5f5f5',
    border: '#cccccc'
  },
  elegant: {
    primary: '#8b4513',
    secondary: '#a0522d',
    accent: '#daa520',
    text: '#3e2723',
    lightGray: '#faf8f5',
    border: '#d7ccc8'
  }
};

// Template Modern (gradient, colorat)
function renderModernTemplate(doc, invoice, companySettings) {
  const colors = COLORS.modern;
  const regularFont = 'Helvetica';
  const boldFont = 'Helvetica-Bold';
  
  // Header cu gradient (simulat cu dreptunghiuri)
  doc.rect(0, 0, 612, 150).fill(colors.primary);
  doc.rect(0, 0, 612, 150).fillOpacity(0.8).fill(colors.secondary);
  
  // Logo/Nume companie
  doc.fillColor('#ffffff')
     .fontSize(24)
     .font(boldFont)
     .text(removeDiacritics(companySettings.name || 'COMPANIA MEA'), 50, 40);
  
  doc.fontSize(9)
     .font(regularFont)
     .text(`CUI: ${removeDiacritics(companySettings.cui || 'N/A')}`, 50, 75)
     .text(`Reg. Com: ${removeDiacritics(companySettings.regCom || 'N/A')}`, 50, 88)
     .text(removeDiacritics(companySettings.address || 'Adresa'), 50, 101)
     .text(`${removeDiacritics(companySettings.city || 'Oras')}, ${removeDiacritics(companySettings.county || 'Judet')}`, 50, 114);

  // Număr factură (dreapta sus)
  doc.fontSize(12)
     .font(boldFont)
     .text(`FACTURA`, 400, 50, { width: 150, align: 'right' });
  
  doc.fontSize(18)
     .fillColor(colors.accent)
     .text(`#${invoice.number}`, 400, 68, { width: 150, align: 'right' });
  
  doc.fontSize(9)
     .fillColor('#ffffff')
     .font(regularFont)
     .text(`Data: ${new Date(invoice.date).toLocaleDateString('ro-RO')}`, 400, 95, { width: 150, align: 'right' })
     .text(`Scadenta: ${new Date(invoice.dueDate).toLocaleDateString('ro-RO')}`, 400, 108, { width: 150, align: 'right' });

  // Client info
  let yPos = 180;
  doc.fillColor(colors.text)
     .fontSize(11)
     .font(boldFont)
     .text('FACTURAT CATRE:', 50, yPos);
  
  yPos += 18;
  doc.fontSize(10)
     .font(boldFont)
     .text(removeDiacritics(invoice.clientName), 50, yPos);
  
  yPos += 15;
  doc.fontSize(9)
     .font(regularFont)
     .text(`CUI: ${invoice.clientCUI || 'N/A'}`, 50, yPos);
  
  yPos += 15;
  if (invoice.clientAddress) {
    doc.text(invoice.clientAddress, 50, yPos);
    yPos += 15;
  }
  
  if (invoice.clientCity) {
    doc.text(`${invoice.clientCity}${invoice.clientCounty ? ', ' + invoice.clientCounty : ''}`, 50, yPos);
    yPos += 15;
  }

  // Tabel produse
  yPos += 20;
  drawModernTable(doc, invoice.products, yPos, colors);
  
  return doc;
}

// Template Classic (profesional, corporate)
function renderClassicTemplate(doc, invoice, companySettings) {
  const colors = COLORS.classic;
  const useRoboto = registerFonts(doc);
  const regularFont = useRoboto ? 'Roboto' : 'Helvetica';
  const boldFont = useRoboto ? 'Roboto-Bold' : 'Helvetica-Bold';
  
  // Header simplu cu border
  doc.rect(40, 40, 532, 100)
     .lineWidth(2)
     .strokeColor(colors.primary)
     .stroke();
  
  // Nume companie
  doc.fillColor(colors.primary)
     .fontSize(24)
     .font(boldFont)
     .text(companySettings.name || 'COMPANIA MEA', 60, 60);
  
  doc.fontSize(9)
     .font(regularFont)
     .fillColor(colors.text)
     .text(`CUI: ${companySettings.cui || 'N/A'} | Reg. Com: ${companySettings.regCom || 'N/A'}`, 60, 90)
     .text(`${companySettings.address || 'Adresă'}, ${companySettings.city || 'Oraș'}`, 60, 105)
     .text(`Tel: ${companySettings.phone || 'N/A'} | Email: ${companySettings.email || 'N/A'}`, 60, 120);

  // Factură info (box dreapta)
  doc.rect(400, 40, 172, 100)
     .fillAndStroke(colors.lightGray, colors.primary);
  
  doc.fillColor(colors.primary)
     .fontSize(16)
     .font(boldFont)
     .text('FACTURĂ FISCALĂ', 410, 50, { width: 152, align: 'center' });
  
  doc.fontSize(11)
     .fillColor(colors.text)
     .font(regularFont)
     .text(`Nr: ${invoice.number}`, 410, 75, { width: 152, align: 'center' })
     .text(`Data: ${new Date(invoice.date).toLocaleDateString('ro-RO')}`, 410, 92, { width: 152, align: 'center' })
     .text(`Scadență: ${new Date(invoice.dueDate).toLocaleDateString('ro-RO')}`, 410, 109, { width: 152, align: 'center' });

  // Client
  let yPos = 170;
  doc.rect(40, yPos, 250, 80)
     .lineWidth(1)
     .strokeColor(colors.border)
     .stroke();
  
  doc.fillColor(colors.primary)
     .fontSize(10)
     .font(boldFont)
     .text('CLIENT:', 50, yPos + 10);
  
  doc.fillColor(colors.text)
     .fontSize(11)
     .font(boldFont)
     .text(invoice.clientName, 50, yPos + 25);
  
  doc.fontSize(9)
     .font(regularFont)
     .text(`CUI: ${invoice.clientCUI || 'N/A'}`, 50, yPos + 42);
  
  if (invoice.clientAddress) {
    doc.text(invoice.clientAddress, 50, yPos + 56, { width: 230 });
  }

  // Tabel produse
  yPos = 280;
  drawClassicTable(doc, invoice.products, yPos, colors);
  
  return doc;
}

// Template Minimal (clean, minimalist)
function renderMinimalTemplate(doc, invoice, companySettings) {
  const colors = COLORS.minimal;
  const useRoboto = registerFonts(doc);
  const regularFont = useRoboto ? 'Roboto' : 'Helvetica';
  const boldFont = useRoboto ? 'Roboto-Bold' : 'Helvetica-Bold';
  
  // Header minimalist
  doc.fillColor(colors.primary)
     .fontSize(32)
     .font(boldFont)
     .text(companySettings.name || 'COMPANIA', 50, 50);
  
  doc.fontSize(8)
     .font(regularFont)
     .fillColor(colors.secondary)
     .text(`${companySettings.address || ''} | ${companySettings.city || ''} | CUI: ${companySettings.cui || ''}`, 50, 90);

  // Factură (dreapta, foarte simplu)
  doc.fillColor(colors.primary)
     .fontSize(12)
     .font(regularFont)
     .text('FACTURĂ', 450, 50, { width: 100, align: 'right' });
  
  doc.fontSize(24)
     .font(boldFont)
     .text(invoice.number, 400, 65, { width: 150, align: 'right' });
  
  doc.fontSize(9)
     .font(regularFont)
     .fillColor(colors.secondary)
     .text(new Date(invoice.date).toLocaleDateString('ro-RO'), 400, 95, { width: 150, align: 'right' });

  // Linie separatoare
  doc.moveTo(50, 120)
     .lineTo(562, 120)
     .strokeColor(colors.border)
     .lineWidth(1)
     .stroke();

  // Client (simplu)
  let yPos = 140;
  doc.fillColor(colors.text)
     .fontSize(10)
     .font(boldFont)
     .text(invoice.clientName, 50, yPos);
  
  yPos += 15;
  doc.fontSize(8)
     .font(regularFont)
     .fillColor(colors.secondary)
     .text(`CUI: ${invoice.clientCUI || 'N/A'}`, 50, yPos);
  
  if (invoice.clientAddress) {
    yPos += 12;
    doc.text(invoice.clientAddress, 50, yPos);
  }

  // Tabel produse (minimal)
  yPos = 200;
  drawMinimalTable(doc, invoice.products, yPos, colors);
  
  return doc;
}

// Template Elegant (premium, luxos)
function renderElegantTemplate(doc, invoice, companySettings) {
  const colors = COLORS.elegant;
  const useRoboto = registerFonts(doc);
  const regularFont = useRoboto ? 'Roboto' : 'Helvetica';
  const boldFont = useRoboto ? 'Roboto-Bold' : 'Helvetica-Bold';
  
  // Border decorativ
  doc.rect(30, 30, 552, 782)
     .lineWidth(3)
     .strokeColor(colors.primary)
     .stroke();
  
  doc.rect(35, 35, 542, 772)
     .lineWidth(1)
     .strokeColor(colors.accent)
     .stroke();

  // Header elegant
  doc.fillColor(colors.primary)
     .fontSize(28)
     .font(boldFont)
     .text(companySettings.name || 'COMPANIA', 60, 60, { width: 400 });
  
  doc.fontSize(9)
     .font(regularFont)
     .fillColor(colors.text)
     .text(companySettings.address || '', 60, 95)
     .text(`${companySettings.city || ''}, ${companySettings.county || ''}`, 60, 108)
     .text(`CUI: ${companySettings.cui || ''} | Reg. Com: ${companySettings.regCom || ''}`, 60, 121);

  // Factură header (elegant box)
  doc.rect(350, 60, 202, 75)
     .lineWidth(2)
     .strokeColor(colors.accent)
     .stroke();
  
  doc.fillColor(colors.primary)
     .fontSize(18)
     .font(boldFont)
     .text('FACTURĂ FISCALĂ', 360, 75, { width: 182, align: 'center' });
  
  doc.fontSize(14)
     .fillColor(colors.accent)
     .text(`№ ${invoice.number}`, 360, 100, { width: 182, align: 'center' });
  
  doc.fontSize(9)
     .fillColor(colors.text)
     .font(regularFont)
     .text(`Emisă: ${new Date(invoice.date).toLocaleDateString('ro-RO')}`, 360, 120, { width: 182, align: 'center' });

  // Client (elegant frame)
  let yPos = 170;
  doc.rect(60, yPos, 492, 70)
     .lineWidth(1)
     .strokeColor(colors.accent)
     .stroke();
  
  doc.fillColor(colors.primary)
     .fontSize(10)
     .font(boldFont)
     .text('BENEFICIAR', 75, yPos + 15);
  
  doc.fillColor(colors.text)
     .fontSize(12)
     .font(boldFont)
     .text(invoice.clientName, 75, yPos + 32);
  
  doc.fontSize(9)
     .font(regularFont)
     .text(`CUI: ${invoice.clientCUI || 'N/A'} | ${invoice.clientAddress || ''}`, 75, yPos + 50);

  // Tabel produse
  yPos = 270;
  drawElegantTable(doc, invoice.products, yPos, colors);
  
  return doc;
}

// Funcții pentru desenare tabele (fiecare template are stilul său)
function drawModernTable(doc, products, startY, colors) {
  const useRoboto = registerFonts(doc);
  const regularFont = useRoboto ? 'Roboto' : 'Helvetica';
  const boldFont = useRoboto ? 'Roboto-Bold' : 'Helvetica-Bold';
  
  const tableTop = startY;
  const itemX = 50;
  const descX = 150;
  const qtyX = 350;
  const priceX = 420;
  const totalX = 500;
  
  // Header tabel
  doc.rect(40, tableTop, 532, 30)
     .fill(colors.primary);
  
  doc.fillColor('#ffffff')
     .fontSize(10)
     .font(boldFont)
     .text('Nr.', itemX, tableTop + 10)
     .text('Descriere', descX, tableTop + 10)
     .text('Cant.', qtyX, tableTop + 10)
     .text('Preț unitar', priceX, tableTop + 10)
     .text('Total', totalX, tableTop + 10);
  
  let y = tableTop + 40;
  let total = 0;
  
  products.forEach((product, index) => {
    const itemTotal = product.quantity * product.price;
    total += itemTotal;
    
    if (index % 2 === 0) {
      doc.rect(40, y - 5, 532, 25).fill(colors.lightGray);
    }
    
    doc.fillColor(colors.text)
       .fontSize(9)
       .font(regularFont)
       .text(index + 1, itemX, y)
       .text(product.name, descX, y, { width: 180 })
       .text(product.quantity.toString(), qtyX, y)
       .text(`${product.price.toFixed(2)} RON`, priceX, y)
       .text(`${itemTotal.toFixed(2)} RON`, totalX, y);
    
    y += 25;
  });
  
  // Total
  y += 10;
  const tva = total * 0.21; // TVA 21%
  const totalTVA = total + tva;
  
  doc.rect(380, y, 192, 80)
     .fill(colors.lightGray);
  
  doc.fillColor(colors.text)
     .fontSize(10)
     .font(regularFont)
     .text('Subtotal:', 390, y + 10)
     .text(`${total.toFixed(2)} RON`, 490, y + 10, { width: 70, align: 'right' })
     .text('TVA (21%):', 390, y + 30)
     .text(`${tva.toFixed(2)} RON`, 490, y + 30, { width: 70, align: 'right' });
  
  doc.font(boldFont)
     .fontSize(12)
     .text('TOTAL:', 390, y + 55)
     .fillColor(colors.primary)
     .text(`${totalTVA.toFixed(2)} RON`, 490, y + 55, { width: 70, align: 'right' });
}

function drawClassicTable(doc, products, startY, colors) {
  const useRoboto = registerFonts(doc);
  const regularFont = useRoboto ? 'Roboto' : 'Helvetica';
  const boldFont = useRoboto ? 'Roboto-Bold' : 'Helvetica-Bold';
  
  // Similar cu modern dar mai sobru
  const tableTop = startY;
  
  // Header
  doc.rect(40, tableTop, 532, 25)
     .fillAndStroke(colors.primary, colors.primary);
  
  doc.fillColor('#ffffff')
     .fontSize(9)
     .font(boldFont)
     .text('Nr', 50, tableTop + 8)
     .text('Produs/Serviciu', 100, tableTop + 8)
     .text('Cant.', 350, tableTop + 8)
     .text('Preț', 420, tableTop + 8)
     .text('Valoare', 500, tableTop + 8);
  
  let y = tableTop + 35;
  let total = 0;
  
  products.forEach((product, index) => {
    const itemTotal = product.quantity * product.price;
    total += itemTotal;
    
    doc.rect(40, y - 5, 532, 20)
       .strokeColor(colors.border)
       .stroke();
    
    doc.fillColor(colors.text)
       .fontSize(9)
       .font(regularFont)
       .text(index + 1, 50, y)
       .text(product.name, 100, y, { width: 230 })
       .text(product.quantity.toString(), 350, y)
       .text(`${product.price.toFixed(2)}`, 420, y)
       .text(`${itemTotal.toFixed(2)}`, 500, y);
    
    y += 20;
  });
  
  // Totale
  y += 15;
  const tva = total * 0.21;
  const totalTVA = total + tva;
  
  doc.fontSize(10)
     .font(regularFont)
     .text('Subtotal:', 400, y)
     .text(`${total.toFixed(2)} RON`, 500, y)
     .text('TVA 21%:', 400, y + 20)
     .text(`${tva.toFixed(2)} RON`, 500, y + 20);
  
  doc.fontSize(12)
     .font(boldFont)
     .fillColor(colors.primary)
     .text('TOTAL DE PLATĂ:', 400, y + 45)
     .text(`${totalTVA.toFixed(2)} RON`, 480, y + 45);
}

function drawMinimalTable(doc, products, startY, colors) {
  const useRoboto = registerFonts(doc);
  const regularFont = useRoboto ? 'Roboto' : 'Helvetica';
  const boldFont = useRoboto ? 'Roboto-Bold' : 'Helvetica-Bold';
  
  let y = startY;
  
  // Header simplu (doar linie)
  doc.fontSize(8)
     .fillColor(colors.secondary)
     .font(boldFont)
     .text('DESCRIERE', 50, y)
     .text('CANT', 350, y)
     .text('PREȚ', 420, y)
     .text('TOTAL', 500, y);
  
  y += 15;
  doc.moveTo(50, y).lineTo(562, y).strokeColor(colors.primary).lineWidth(2).stroke();
  
  y += 15;
  let total = 0;
  
  products.forEach((product) => {
    const itemTotal = product.quantity * product.price;
    total += itemTotal;
    
    doc.fillColor(colors.text)
       .fontSize(9)
       .font(regularFont)
       .text(product.name, 50, y, { width: 280 })
       .text(product.quantity.toString(), 350, y)
       .text(product.price.toFixed(2), 420, y)
       .text(itemTotal.toFixed(2), 500, y);
    
    y += 20;
  });
  
  y += 10;
  doc.moveTo(50, y).lineTo(562, y).strokeColor(colors.border).lineWidth(1).stroke();
  
  y += 20;
  const tva = total * 0.21;
  const totalTVA = total + tva;
  
  doc.fontSize(9)
     .fillColor(colors.secondary)
     .text(`Subtotal: ${total.toFixed(2)} RON`, 400, y, { width: 150, align: 'right' })
     .text(`TVA 21%: ${tva.toFixed(2)} RON`, 400, y + 15, { width: 150, align: 'right' });
  
  doc.fontSize(14)
     .fillColor(colors.primary)
     .font(boldFont)
     .text(`${totalTVA.toFixed(2)} RON`, 400, y + 40, { width: 150, align: 'right' });
}

function drawElegantTable(doc, products, startY, colors) {
  const useRoboto = registerFonts(doc);
  const regularFont = useRoboto ? 'Roboto' : 'Helvetica';
  const boldFont = useRoboto ? 'Roboto-Bold' : 'Helvetica-Bold';
  
  const tableTop = startY;
  
  // Header decorativ
  doc.rect(60, tableTop, 492, 28)
     .lineWidth(2)
     .strokeColor(colors.accent)
     .stroke();
  
  doc.fillColor(colors.primary)
     .fontSize(9)
     .font(boldFont)
     .text('Denumire produs/serviciu', 75, tableTop + 10)
     .text('U.M.', 350, tableTop + 10)
     .text('Cantitate', 395, tableTop + 10)
     .text('Preț unitar', 455, tableTop + 10)
     .text('Valoare', 510, tableTop + 10);
  
  let y = tableTop + 40;
  let total = 0;
  
  products.forEach((product, index) => {
    const itemTotal = product.quantity * product.price;
    total += itemTotal;
    
    doc.rect(60, y - 5, 492, 22)
       .strokeColor(colors.accent)
       .lineWidth(0.5)
       .stroke();
    
    doc.fillColor(colors.text)
       .fontSize(9)
       .font(regularFont)
       .text(product.name, 75, y, { width: 260 })
       .text('buc', 350, y)
       .text(product.quantity.toString(), 395, y)
       .text(product.price.toFixed(2), 455, y)
       .text(itemTotal.toFixed(2), 510, y);
    
    y += 22;
  });
  
  // Totale elegante
  y += 20;
  const tva = total * 0.21;
  const totalTVA = total + tva;
  
  doc.rect(350, y, 202, 90)
     .lineWidth(2)
     .strokeColor(colors.accent)
     .stroke();
  
  doc.fillColor(colors.text)
     .fontSize(10)
     .font(regularFont)
     .text('Total fără TVA:', 365, y + 15)
     .text(`${total.toFixed(2)} RON`, 470, y + 15, { width: 70, align: 'right' })
     .text('TVA (21%):', 365, y + 35)
     .text(`${tva.toFixed(2)} RON`, 470, y + 35, { width: 70, align: 'right' });
  
  doc.fillColor(colors.primary)
     .fontSize(12)
     .font(boldFont)
     .text('TOTAL DE PLATĂ:', 365, y + 60)
     .text(`${totalTVA.toFixed(2)} RON`, 450, y + 60, { width: 90, align: 'right' });
}

module.exports = {
  renderModernTemplate,
  renderClassicTemplate,
  renderMinimalTemplate,
  renderElegantTemplate,
  COLORS
};

