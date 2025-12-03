const prisma = require('../db/prismaWrapper');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Director pentru salvarea facturilor PDF
const invoicesDir = path.join(__dirname, '../../invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

// Generare număr factură unic
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}${month}${day}${random}`;
}

// Generare factură nouă (din interfața web)
async function createInvoice(req, res) {
  console.log('🔵 createInvoice apelat cu body:', JSON.stringify(req.body, null, 2));
  try {
    if (!prisma) {
      console.log('❌ Prisma nu este disponibil');
      return res.status(503).json({ 
        success: false, 
        error: 'Baza de date nu este configurată' 
      });
    }

    const { client, products } = req.body;
    console.log('🔵 Client:', client);
    console.log('🔵 Products:', products);

    // Validare date client
    if (!client || !products || products.length === 0) {
      console.log('❌ Validare eșuată - lipsesc date');
      return res.status(400).json({ 
        success: false, 
        error: 'Date invalide. Verificați clientul și produsele.' 
      });
    }

    // Obține setările companiei emitente
    const settingsController = require('./settingsController');
    const settings = settingsController.getSettings();

    // Calculează totaluri pentru fiecare produs
    const itemsData = products.map(product => {
      const quantity = parseFloat(product.quantity);
      const price = parseFloat(product.price);
      const vatRate = parseFloat(product.vat) / 100; // convertește din % în decimal
      
      const subtotal = quantity * price;
      const vatAmount = subtotal * vatRate;
      const total = subtotal + vatAmount;

      return {
        name: product.name,
        unit: product.unit || 'buc',
        quantity,
        price,
        vatRate,
        subtotal,
        vatAmount,
        total
      };
    });

    // Calculează totaluri generale
    const invoiceSubtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
    const invoiceVatAmount = itemsData.reduce((sum, item) => sum + item.vatAmount, 0);
    const invoiceTotal = invoiceSubtotal + invoiceVatAmount;

    // Pregătește datele pentru factură
    const invoiceData = {
      invoiceNumber: generateInvoiceNumber(),
      subtotal: invoiceSubtotal,
      tvaAmount: invoiceVatAmount,
      total: invoiceTotal,
      issueDate: new Date(),
      status: 'generated',
      
      // Date emitent (din setări)
      providerName: settings.name || '',
      providerCUI: settings.cui || '',
      providerRegCom: settings.regCom || '',
      providerAddress: settings.address || '',
      providerCity: settings.city || '',
      providerCounty: settings.county || '',
      providerEmail: settings.email || '',
      providerPhone: settings.phone || '',
      providerBank: settings.bank || '',
      providerIban: settings.iban || '',
      providerCapital: settings.capital || '',
      
      // Date client/beneficiar
      clientType: client.type,
      clientName: client.type === 'company' ? client.name : `${client.firstName} ${client.lastName}`,
      clientCUI: client.type === 'company' ? client.cui : null,
      clientRegCom: client.type === 'company' ? client.regCom : null,
      clientCNP: client.type === 'individual' ? client.cnp : null,
      clientFirstName: client.type === 'individual' ? client.firstName : null,
      clientLastName: client.type === 'individual' ? client.lastName : null,
      clientAddress: client.address || '',
      clientCity: client.city || '',
      clientCounty: client.county || '',
      
      // Produse/servicii
      items: {
        create: itemsData
      }
    };

    // Salvează factura în baza de date
    console.log('🔵 Se salvează factura în DB...');
    const invoice = await prisma.invoice.create({
      data: invoiceData,
      include: {
        items: true
      }
    });
    console.log('✅ Factură salvată cu ID:', invoice.id);

    // Generează PDF
    console.log('🔵 Se generează PDF...');
    const pdfPath = await generateInvoicePDF(invoice);
    console.log('✅ PDF generat:', pdfPath);
    
    // Actualizează cu calea PDF
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfPath },
      include: {
        items: true
      }
    });

    console.log('✅ Factură completă returnată');
    res.status(201).json({
      success: true,
      invoice: updatedInvoice,
      pdfPath: pdfPath
    });

  } catch (error) {
    console.error('❌ Eroare creare factură:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Eroare la crearea facturii',
      details: error.message 
    });
  }
}


// Generare PDF pentru factură
async function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔵 Începe generarea PDF pentru:', invoice.invoiceNumber);
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(invoicesDir, fileName);
      
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('FACTURĂ', { align: 'center' })
         .font('Helvetica')
         .moveDown();

      // Informații factură
      doc.fontSize(12)
         .text(`Serie/Număr: ${invoice.invoiceNumber}`)
         .text(`Data: ${new Date(invoice.issueDate).toLocaleDateString('ro-RO')}`)
         .moveDown(1.5);

    // Două coloane: Furnizor și Client
    const leftColumn = 50;
    const rightColumn = 300;
    let yPos = doc.y;

    // Informații furnizor (stânga)
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('FURNIZOR/PRESTATOR:', leftColumn, yPos)
       .font('Helvetica')
       .fontSize(10)
       .text(invoice.providerName, leftColumn, yPos + 15)
       .text(`CUI: ${invoice.providerCUI}`, leftColumn, yPos + 30);
    
    if (invoice.providerRegCom) {
      doc.text(`Reg.Com.: ${invoice.providerRegCom}`, leftColumn, yPos + 45);
      yPos += 15;
    }
    
    doc.text(`Adresa: ${invoice.providerAddress}`, leftColumn, yPos + 45, { width: 230 });
    yPos += 30;
    
    if (invoice.providerCity) {
      doc.text(`${invoice.providerCity}${invoice.providerCounty ? ', ' + invoice.providerCounty : ''}`, leftColumn, yPos + 45);
      yPos += 15;
    }
    
    if (invoice.providerPhone) {
      doc.text(`Tel: ${invoice.providerPhone}`, leftColumn, yPos + 45);
      yPos += 15;
    }
    
    if (invoice.providerEmail) {
      doc.text(`Email: ${invoice.providerEmail}`, leftColumn, yPos + 45);
    }

    // Resetează yPos pentru coloana client
    yPos = doc.y - 120;

    // Informații client (dreapta)
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('CLIENT/BENEFICIAR:', rightColumn, yPos)
       .font('Helvetica')
       .fontSize(10)
       .text(invoice.clientName, rightColumn, yPos + 15);
    
    if (invoice.clientType === 'company' && invoice.clientCUI) {
      doc.text(`CUI: ${invoice.clientCUI}`, rightColumn, yPos + 30);
      if (invoice.clientRegCom) {
        doc.text(`Reg.Com.: ${invoice.clientRegCom}`, rightColumn, yPos + 45);
        yPos += 15;
      }
    } else if (invoice.clientType === 'individual' && invoice.clientCNP) {
      doc.text(`CNP: ${invoice.clientCNP}`, rightColumn, yPos + 30);
    }
    
    if (invoice.clientAddress) {
      doc.text(`Adresa: ${invoice.clientAddress}`, rightColumn, yPos + 45, { width: 230 });
      yPos += 30;
    }
    
    if (invoice.clientCity) {
      doc.text(`${invoice.clientCity}${invoice.clientCounty ? ', ' + invoice.clientCounty : ''}`, rightColumn, yPos + 45);
    }

    // Spațiu înainte de tabel
    doc.moveDown(8);

    // Tabel cu produse/servicii
    const tableTop = doc.y;
    const col1 = 50;   // Denumire
    const col2 = 280;  // UM
    const col3 = 320;  // Cantitate
    const col4 = 370;  // Preț
    const col5 = 440;  // TVA
    const col6 = 490;  // Total
    
    doc.fontSize(9)
       .font('Helvetica-Bold');
    
    // Header tabel
    doc.rect(col1, tableTop - 5, 490, 20).fillAndStroke('#667eea', '#667eea');
    doc.fillColor('white')
       .text('Denumire produs/serviciu', col1 + 5, tableTop, { width: 220 })
       .text('UM', col2, tableTop, { width: 30 })
       .text('Cant.', col3, tableTop, { width: 40 })
       .text('Preț', col4, tableTop, { width: 60 })
       .text('TVA%', col5, tableTop, { width: 40 })
       .text('Total', col6, tableTop, { width: 50 });
    
    doc.fillColor('black').font('Helvetica');

    // Rânduri tabel
    let yPosition = tableTop + 25;
    
    invoice.items.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? '#f8f9ff' : 'white';
      doc.rect(col1, yPosition - 5, 490, 20).fillAndStroke(bgColor, bgColor);
      
      doc.fillColor('black')
         .text(item.name, col1 + 5, yPosition, { width: 220 })
         .text(item.unit, col2, yPosition, { width: 30 })
         .text(item.quantity.toFixed(2), col3, yPosition, { width: 40 })
         .text(item.price.toFixed(2), col4, yPosition, { width: 60 })
         .text((item.vatRate * 100).toFixed(0), col5, yPosition, { width: 40 })
         .text(item.total.toFixed(2), col6, yPosition, { width: 50 });
      
      yPosition += 20;
    });

    // Linie separator
    doc.moveTo(col1, yPosition)
       .lineTo(540, yPosition)
       .stroke();

    // Totale
    yPosition += 15;
    doc.fontSize(10)
       .font('Helvetica')
       .text('Subtotal (fără TVA):', col4, yPosition)
       .text(`${invoice.subtotal.toFixed(2)} RON`, col6, yPosition);
    
    yPosition += 20;
    doc.text('TVA:', col4, yPosition)
       .text(`${invoice.tvaAmount.toFixed(2)} RON`, col6, yPosition);
    
    yPosition += 25;
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('TOTAL DE PLATĂ:', col4, yPosition)
       .text(`${invoice.total.toFixed(2)} RON`, col6, yPosition);

    // Date bancare (dacă există)
    if (invoice.providerIban || invoice.providerBank) {
      doc.moveDown(2);
      doc.fontSize(9)
         .font('Helvetica')
         .text('Date bancare:', 50);
      
      if (invoice.providerBank) {
        doc.text(`Banca: ${invoice.providerBank}`, 50);
      }
      if (invoice.providerIban) {
        doc.text(`IBAN: ${invoice.providerIban}`, 50);
      }
    }

    // Footer
    doc.fontSize(8)
       .text('Mulțumim pentru colaborare!', 50, 730, { align: 'center' })
       .text(`Document generat la ${new Date().toLocaleString('ro-RO')}`, 50, 745, { align: 'center' });

    console.log('🔵 PDF scris, se închide stream-ul...');
    doc.end();
    
    writeStream.on('finish', () => {
      console.log('✅ PDF finalizat:', fileName);
      resolve(fileName);
    });
    
    writeStream.on('error', (err) => {
      console.error('❌ Eroare scriere PDF:', err);
      reject(err);
    });
    
    doc.on('error', (err) => {
      console.error('❌ Eroare generare PDF:', err);
      reject(err);
    });
    
    } catch (error) {
      console.error('❌ Eroare în generateInvoicePDF:', error);
      reject(error);
    }
  });
}

// Obține toate facturile
async function getInvoices(req, res) {
  console.log('🔵 getInvoices apelat');
  try {
    if (!prisma) {
      console.log('❌ Prisma nu este disponibil');
      return res.status(503).json({ 
        success: false, 
        error: 'Baza de date nu este configurată' 
      });
    }

    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: true
      }
    });
    
    console.log(`✅ Găsite ${invoices.length} facturi`);
    res.json({
      success: true,
      invoices
    });
  } catch (error) {
    console.error('❌ Eroare obținere facturi:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Eroare la obținerea facturilor' 
    });
  }
}

// Obține o factură specifică
async function getInvoice(req, res) {
  try {
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        error: 'Baza de date nu este configurată' 
      });
    }

    const { id } = req.params;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true
      }
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        error: 'Factură negăsită' 
      });
    }
    
    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Eroare obținere factură:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Eroare la obținerea facturii' 
    });
  }
}

// Descărcare PDF factură
async function downloadInvoice(req, res) {
  try {
    const { id } = req.params;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Factură negăsită' });
    }

    const filePath = path.join(invoicesDir, `${invoice.invoiceNumber}.pdf`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fișier PDF negăsit' });
    }

    res.download(filePath, `${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    console.error('Eroare descărcare factură:', error);
    res.status(500).json({ error: 'Eroare la descărcarea facturii' });
  }
}

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  downloadInvoice
};
