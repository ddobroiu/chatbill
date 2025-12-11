const prisma = require('../db/prismaWrapper');
const PDFDocument = require('pdfkit');
const {
  renderModernTemplate,
  renderClassicTemplate
} = require('../services/pdfTemplates');

// Generează preview PDF fără a salva în baza de date
async function generateInvoicePreview(req, res) {
  console.log('🔵 generateInvoicePreview apelat');
  try {
    const { client, products, template: requestTemplate } = req.body;
    const userId = req.user?.id || 1;

    if (!client || !products || products.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Informațiile despre client și produse sunt obligatorii' 
      });
    }

    // Obține setările companiei
    let companySettings = await prisma.companySettings.findUnique({
      where: { userId }
    });

    if (!companySettings) {
      companySettings = {
        companyName: 'Compania Ta SRL',
        name: 'Compania Ta SRL',
        cui: '12345678',
        regCom: 'J00/1234/2024',
        address: 'Str. Exemplu, Nr. 1',
        city: 'București',
        county: 'București',
        email: 'contact@companie.ro',
        phone: '+40 123 456 789',
        iban: 'RO00BANK0000000000000000',
        bank: 'Banca Exemplu',
        preferredTemplate: 'modern'
      };
    }

    const finalTemplate = requestTemplate || companySettings.preferredTemplate || 'modern';

    // Verifică dacă compania este plătitoare de TVA
    const isVatPayer = companySettings.isVatPayer !== false;
    const vatRateFromSettings = companySettings.vatRate || 19;

    // Calculează totaluri
    const itemsData = products.map(product => {
      const quantity = parseFloat(product.quantity);
      const price = parseFloat(product.price);
      
      // Dacă nu e plătitor de TVA, TVA = 0
      const vatRate = isVatPayer ? (parseFloat(product.vat) / 100) : 0;
      
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

    const invoiceSubtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
    const invoiceVatAmount = isVatPayer ? itemsData.reduce((sum, item) => sum + item.vatAmount, 0) : 0;
    const invoiceTotal = invoiceSubtotal + invoiceVatAmount;

    // Creează un obiect invoice mock pentru preview
    const mockInvoice = {
      number: 'PREVIEW',
      invoiceNumber: 'PREVIEW',
      date: new Date(),
      createdAt: new Date(),
      subtotal: invoiceSubtotal,
      tvaAmount: invoiceVatAmount,
      total: invoiceTotal,
      
      clientType: client.type,
      clientName: client.type === 'company' ? client.name : `${client.firstName} ${client.lastName}`,
      clientCUI: client.type === 'company' ? client.cui : null,
      clientRegCom: client.type === 'company' ? client.regCom : null,
      clientCNP: client.type === 'individual' ? client.cnp : null,
      clientAddress: client.address || '',
      clientCity: client.city || '',
      clientCounty: client.county || '',
      
      items: itemsData
    };

    // Generare PDF în memorie
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set headers pentru preview PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    
    doc.pipe(res);

    // Randează template-ul selectat
    switch (finalTemplate) {
      case 'classic':
        renderClassicTemplate(doc, mockInvoice, companySettings, false);
        break;
      default:
        renderModernTemplate(doc, mockInvoice, companySettings, false);
    }

    doc.end();

  } catch (error) {
    console.error('❌ Eroare generare preview:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: 'Eroare la generarea preview-ului' 
      });
    }
  }
}

// Generează preview proformă fără a salva în baza de date
async function generateProformaPreview(req, res) {
  console.log('🔵 generateProformaPreview apelat');
  try {
    const { client, products, template: requestTemplate } = req.body;
    const userId = req.user?.id || 1;

    if (!client || !products || products.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Informațiile despre client și produse sunt obligatorii' 
      });
    }

    let companySettings = await prisma.companySettings.findUnique({
      where: { userId }
    });

    if (!companySettings) {
      companySettings = {
        companyName: 'Compania Ta SRL',
        name: 'Compania Ta SRL',
        cui: '12345678',
        regCom: 'J00/1234/2024',
        address: 'Str. Exemplu, Nr. 1',
        city: 'București',
        county: 'București',
        email: 'contact@companie.ro',
        phone: '+40 123 456 789',
        iban: 'RO00BANK0000000000000000',
        bank: 'Banca Exemplu',
        preferredTemplate: 'modern'
      };
    }

    const finalTemplate = requestTemplate || companySettings.preferredTemplate || 'modern';

    // Verifică dacă compania este plătitoare de TVA
    const isVatPayer = companySettings.isVatPayer !== false;
    const vatRateFromSettings = companySettings.vatRate || 19;

    const itemsData = products.map(product => {
      const quantity = parseFloat(product.quantity);
      const price = parseFloat(product.price);
      
      // Dacă nu e plătitor de TVA, TVA = 0
      const vatRate = isVatPayer ? (parseFloat(product.vat) / 100) : 0;
      
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

    const proformaSubtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
    const proformaVatAmount = isVatPayer ? itemsData.reduce((sum, item) => sum + item.vatAmount, 0) : 0;
    const proformaTotal = proformaSubtotal + proformaVatAmount;

    const mockProforma = {
      number: 'PREVIEW',
      proformaNumber: 'PREVIEW',
      date: new Date(),
      createdAt: new Date(),
      issueDate: new Date(),
      subtotal: proformaSubtotal,
      tvaAmount: proformaVatAmount,
      total: proformaTotal,
      
      clientType: client.type,
      clientName: client.type === 'company' ? client.name : `${client.firstName} ${client.lastName}`,
      clientCUI: client.type === 'company' ? client.cui : null,
      clientRegCom: client.type === 'company' ? client.regCom : null,
      clientCNP: client.type === 'individual' ? client.cnp : null,
      clientAddress: client.address || '',
      clientCity: client.city || '',
      clientCounty: client.county || '',
      
      items: itemsData
    };

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview_proforma.pdf"');
    
    doc.pipe(res);

    switch (finalTemplate) {
      case 'classic':
        renderClassicTemplate(doc, mockProforma, companySettings, true);
        break;
      default:
        renderModernTemplate(doc, mockProforma, companySettings, true);
    }

    doc.end();

  } catch (error) {
    console.error('❌ Eroare generare preview proformă:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: 'Eroare la generarea preview-ului' 
      });
    }
  }
}

module.exports = {
  generateInvoicePreview,
  generateProformaPreview
};
