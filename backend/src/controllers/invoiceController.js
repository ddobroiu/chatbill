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
  try {
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        error: 'Baza de date nu este configurată' 
      });
    }

    const { client, products } = req.body;

    // Validare date client
    if (!client || !products || products.length === 0) {
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
    const invoice = await prisma.invoice.create({
      data: invoiceData,
      include: {
        items: true
      }
    });

    // Generează PDF
    const pdfPath = await generateInvoicePDF(invoice);
    
    // Actualizează cu calea PDF
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfPath },
      include: {
        items: true
      }
    });

    res.status(201).json({
      success: true,
      invoice: updatedInvoice,
      pdfPath: pdfPath
    });

  } catch (error) {
    console.error('Eroare creare factură:', error);
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
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `${invoice.invoiceNumber}.pdf`;
    const filePath = path.join(invoicesDir, fileName);
    
    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(20)
       .text('FACTURĂ', { align: 'center' })
       .moveDown();

    // Informații factură
    doc.fontSize(12)
       .text(`Număr factură: ${invoice.invoiceNumber}`)
       .text(`Data: ${new Date(invoice.issueDate).toLocaleDateString('ro-RO')}`)
       .moveDown();

    // Informații furnizor
    doc.fontSize(10)
       .text('Furnizor:', { underline: true })
       .text(invoice.providerName)
       .text(`CUI: ${invoice.providerCUI}`)
       .text(`Adresa: ${invoice.providerAddress}`)
       .text(`Email: ${invoice.providerEmail}`)
       .text(`Telefon: ${invoice.providerPhone}`)
       .moveDown();

    // Informații client
    doc.fontSize(10)
       .text('Client:', { underline: true })
       .text(invoice.clientName)
       .text(`CUI: ${invoice.clientCUI}`)
       .text(`Adresa: ${invoice.clientAddress || 'N/A'}`)
       .text(`Email: ${invoice.clientEmail || 'N/A'}`)
       .moveDown();

    // Tabel cu servicii
    const tableTop = doc.y;
    doc.fontSize(10);
    
    // Header tabel
    doc.text('Descriere', 50, tableTop, { width: 200 })
       .text('Cantitate', 250, tableTop, { width: 80 })
       .text('Preț unitar', 330, tableTop, { width: 80 })
       .text('Total', 410, tableTop, { width: 80 });
    
    doc.moveTo(50, tableTop + 15)
       .lineTo(500, tableTop + 15)
       .stroke();

    // Rând tabel
    const rowTop = tableTop + 25;
    doc.text('Mesaje de chat', 50, rowTop, { width: 200 })
       .text(invoice.messageCount.toString(), 250, rowTop, { width: 80 })
       .text(`${invoice.pricePerMessage.toFixed(2)} RON`, 330, rowTop, { width: 80 })
       .text(`${invoice.subtotal.toFixed(2)} RON`, 410, rowTop, { width: 80 });

    doc.moveDown(3);

    // Totale
    const totalsTop = doc.y + 20;
    
    doc.text('Subtotal:', 330, totalsTop)
       .text(`${invoice.subtotal.toFixed(2)} RON`, 410, totalsTop);
    
    doc.text(`TVA (${(invoice.tvaRate * 100).toFixed(0)}%):`, 330, totalsTop + 20)
       .text(`${invoice.tvaAmount.toFixed(2)} RON`, 410, totalsTop + 20);
    
    doc.fontSize(12)
       .text('TOTAL:', 330, totalsTop + 45, { bold: true })
       .text(`${invoice.total.toFixed(2)} RON`, 410, totalsTop + 45);

    // Footer
    doc.fontSize(8)
       .text('Mulțumim pentru colaborare!', 50, 700, { align: 'center' })
       .text(`Pentru întrebări, contactați-ne la: ${invoice.providerEmail}`, { align: 'center' });

    doc.end();
    
    doc.on('finish', () => resolve(fileName));
    doc.on('error', reject);
  });
}

// Obține toate facturile
async function getInvoices(req, res) {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        company: true,
        conversation: true
      }
    });
    
    res.json(invoices);
  } catch (error) {
    console.error('Eroare obținere facturi:', error);
    res.status(500).json({ error: 'Eroare la obținerea facturilor' });
  }
}

// Obține o factură specifică
async function getInvoice(req, res) {
  try {
    const { id } = req.params;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        conversation: true
      }
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Factură negăsită' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Eroare obținere factură:', error);
    res.status(500).json({ error: 'Eroare la obținerea facturii' });
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
  generateInvoice,
  getInvoices,
  getInvoice,
  downloadInvoice
};
