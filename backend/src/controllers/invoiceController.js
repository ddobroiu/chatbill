const prisma = require('../db/prismaWrapper');
const fs = require('fs');
const path = require('path');
const { createPDF } = require('../services/pdfGenerator');

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

    const { client, products, template: requestTemplate } = req.body;
    const userId = req.user.id; // Asigură-te că ai middleware de autentificare

    console.log('🔵 Client:', client);
    console.log('🔵 Products:', products);
    console.log('🔵 Template din request:', requestTemplate);

    // Validare date client
    if (!client || !products || products.length === 0) {
      console.log('❌ Validare eșuată - lipsesc date');
      return res.status(400).json({ 
        success: false, 
        error: 'Date invalide. Verificați clientul și produsele.' 
      });
    }

    // Obține setările companiei emitente specifice user-ului
    const companySettings = await prisma.companySettings.findUnique({
      where: { userId },
    });

    if (!companySettings) {
      return res.status(404).json({
        success: false,
        error: 'Setările companiei nu au fost găsite. Vă rugăm să le configurați.',
      });
    }
    
    // Determină template-ul final
    const finalTemplate = requestTemplate || companySettings.preferredTemplate || 'modern';
    console.log('🔵 Template final selectat:', finalTemplate);

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
      template: finalTemplate, // Adaugă template-ul selectat
      
      // Date emitent (din setări) - doar câmpurile care există în schema
      providerName: companySettings.name || '',
      providerCUI: companySettings.cui || '',
      providerRegCom: companySettings.regCom || '',
      providerAddress: companySettings.address || '',
      providerCity: companySettings.city || '',
      providerCounty: companySettings.county || '',
      providerPhone: companySettings.phone || '',
      providerEmail: companySettings.email || '',
      providerBank: companySettings.bank || '',
      providerIban: companySettings.iban || '',
      providerCapital: companySettings.capital || '',
      
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
    const pdfResult = await generateInvoicePDF(invoice);
    console.log('✅ PDF generat:', pdfResult.pdfPath);
    
    // Actualizează cu calea PDF
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfPath: pdfResult.pdfPath },
      include: {
        items: true
      }
    });

    console.log('✅ Factură completă returnată');
    res.status(201).json({
      success: true,
      invoice: updatedInvoice,
      pdfPath: pdfResult.pdfPath
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


// Generare PDF pentru factură folosind pdfmake modern
async function generateInvoicePDF(invoice) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🔵 Începe generarea PDF pentru:', invoice.invoiceNumber, 'Template:', invoice.template || 'modern');
      
      const fileName = `${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      // Pregătește datele pentru template
      const companySettings = {
        name: invoice.providerName,
        cui: invoice.providerCUI,
        regCom: invoice.providerRegCom,
        address: invoice.providerAddress,
        city: invoice.providerCity,
        county: invoice.providerCounty,
        phone: invoice.providerPhone,
        email: invoice.providerEmail,
        bank: invoice.providerBank,
        iban: invoice.providerIban,
        capital: invoice.providerCapital
      };

      const invoiceData = {
        number: invoice.invoiceNumber,
        date: invoice.issueDate,
        dueDate: invoice.dueDate,
        clientName: invoice.clientName,
        clientCUI: invoice.clientCUI,
        clientRegCom: invoice.clientRegCom,
        clientCNP: invoice.clientCNP,
        clientAddress: invoice.clientAddress,
        clientCity: invoice.clientCity,
        clientCounty: invoice.clientCounty,
        items: invoice.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit || 'buc',
          vat: item.vat || 19
        })),
        subtotal: invoice.subtotal,
        tvaAmount: invoice.tvaAmount,
        total: invoice.total
      };

      // Selectează template-ul
      const template = invoice.template || 'modern';
      
      console.log('🔵 Generare PDF cu pdfmake...');
      
      // Generează PDF-ul cu pdfmake
      const pdfBuffer = await createPDF(invoiceData, companySettings, template);
      
      // Salvează fișierul
      fs.writeFileSync(filePath, pdfBuffer);
      
      console.log('✅ PDF generat: /invoices/' + fileName);
      
      resolve({
        success: true,
        pdfPath: `/invoices/${fileName}`,
        fileName: fileName
      });
      
    } catch (error) {
      console.error('❌ Eroare generare PDF:', error);
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
