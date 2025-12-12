const prisma = require('../db/prismaWrapper');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const {
  renderModernTemplate,
  renderClassicTemplate
} = require('../services/pdfTemplates');

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

    const { client, products, template: requestTemplate, provider } = req.body;
    const userId = req.user?.id; // Optional - poate fi null pentru useri neautentificați

    console.log('🔵 Client:', client);
    console.log('🔵 Products:', products);
    console.log('🔵 Provider:', provider);
    console.log('🔵 Template din request:', requestTemplate);
    console.log('🔵 User ID:', userId || 'Guest');

    // Validare date client
    if (!client || !products || products.length === 0) {
      console.log('❌ Validare eșuată - lipsesc date');
      return res.status(400).json({ 
        success: false, 
        error: 'Date invalide. Verificați clientul și produsele.' 
      });
    }

    // Obține setările companiei emitente
    let companySettings = null;
    
    if (userId) {
      // User autentificat - folosește setările salvate
      companySettings = await prisma.companySettings.findUnique({
        where: { userId },
      });
    }
    
    // Dacă nu există setări (user neautentificat sau setări neconfigurate), folosește datele din provider
    if (!companySettings && !provider) {
      return res.status(400).json({
        success: false,
        error: 'Vă rugăm să completați datele companiei emitente.',
      });
    }
    
    // Construiește setările finale (din DB sau din request)
    const finalSettings = companySettings || {
      cui: provider?.cui,
      name: provider?.name,
      regCom: provider?.regCom,
      address: provider?.address,
      city: provider?.city,
      county: provider?.county,
      phone: provider?.phone,
      email: provider?.email,
      bank: provider?.bank,
      iban: provider?.iban,
      capital: provider?.capital,
      isVatPayer: provider?.isVatPayer !== false,
      vatRate: provider?.vatRate || 19,
      invoiceTemplate: provider?.template || 'modern',
      invoiceSeries: provider?.series || 'FAC',
      invoiceStartNumber: provider?.startNumber || 1
    };
    
    // Determină template-ul final (folosește invoiceTemplate în loc de preferredTemplate)
    const finalTemplate = requestTemplate || finalSettings.invoiceTemplate || 'modern';
    console.log('🔵 Template final selectat pentru factură:', finalTemplate);

    // Verifică dacă compania este plătitoare de TVA
    const isVatPayer = finalSettings.isVatPayer !== false; // default true
    const vatRateFromSettings = finalSettings.vatRate || 19;
    
    console.log('🔵 Setări TVA - Plătitor:', isVatPayer, 'Cotă:', vatRateFromSettings + '%');

    // Calculează totaluri pentru fiecare produs
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

    // Calculează totaluri generale
    const invoiceSubtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
    const invoiceVatAmount = isVatPayer ? itemsData.reduce((sum, item) => sum + item.vatAmount, 0) : 0;
    const invoiceTotal = invoiceSubtotal + invoiceVatAmount;

    // Generare număr factură bazat pe setări
    const invoiceSeries = finalSettings.invoiceSeries || 'FAC';
    const startNumber = finalSettings.invoiceStartNumber || 1;
    
    // Găsește ultima factură pentru acest user (dacă e autentificat)
    const lastInvoice = userId ? await prisma.invoice.findFirst({
      where: { 
        userId,
        invoiceNumber: { startsWith: invoiceSeries } 
      },
      orderBy: { createdAt: 'desc' }
    }) : null;
    
    let invoiceNumber;
    if (lastInvoice && lastInvoice.number) {
      // Extrage numărul din ultima factură (presupunem format SERIE-NUMAR)
      const match = lastInvoice.number.match(/(\d+)$/);
      if (match) {
        const lastNum = parseInt(match[1]);
        invoiceNumber = `${invoiceSeries}-${(lastNum + 1).toString().padStart(4, '0')}`;
      } else {
        invoiceNumber = `${invoiceSeries}-${startNumber.toString().padStart(4, '0')}`;
      }
    } else {
      invoiceNumber = `${invoiceSeries}-${startNumber.toString().padStart(4, '0')}`;
    }

    // Pregătește datele pentru factură
    const invoiceData = {
      invoiceNumber: invoiceNumber,
      subtotal: invoiceSubtotal,
      tvaAmount: invoiceVatAmount,
      total: invoiceTotal,
      issueDate: new Date(),
      status: 'generated',
      template: finalTemplate, // Adaugă template-ul selectat
      
      // Date emitent (din setări)
      providerName: finalSettings.name || '',
      providerCUI: finalSettings.cui || '',
      providerRegCom: finalSettings.regCom || '',
      providerAddress: finalSettings.address || '',
      providerCity: finalSettings.city || '',
      providerCounty: finalSettings.county || '',
      providerPhone: finalSettings.phone || '',
      providerEmail: finalSettings.email || '',
      providerBank: finalSettings.bank || '',
      providerIBAN: finalSettings.iban || '',
      providerCapital: finalSettings.capital || '',
      providerLegalRep: finalSettings.legalRep || '',
      
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
      data: {
        ...invoiceData,
        // userId e opțional - doar pentru useri autentificați
        ...(userId && { userId })
      },
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


// Generare PDF pentru factură folosind template-uri
async function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔵 Începe generarea PDF pentru:', invoice.invoiceNumber, 'Template:', invoice.template || 'modern');
      
      const doc = new PDFDocument({ 
        margin: 0,
        size: 'A4',
        bufferPages: true
      });
      
      const fileName = `${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(invoicesDir, fileName);
      
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

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
        products: invoice.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit || 'buc'
        })),
        subtotal: invoice.subtotal,
        tvaAmount: invoice.tvaAmount,
        total: invoice.total
      };

      // Selectează template-ul
      const template = invoice.template || 'modern';
      
      switch (template) {
        case 'classic':
          renderClassicTemplate(doc, invoiceData, companySettings);
          break;
        case 'modern':
        default:
          renderModernTemplate(doc, invoiceData, companySettings);
          break;
      }

      // Footer common pentru toate template-urile
      doc.fontSize(8)
         .fillColor('#666666')
         .font('Helvetica')
         .text('Document generat cu ChatBill', 50, 780, { align: 'center', width: 512 })
         .text(`Data generării: ${new Date().toLocaleString('ro-RO')}`, 50, 795, { align: 'center', width: 512 });

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
      
    } catch (error) {
      console.error('❌ Eroare generare PDF:', error);
      reject(error);
    }
  });
}

// Obține toate facturile (cu paginare)
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

    const { getPaginationParams, getSortParams, formatPaginatedResponse } = require('../utils/pagination');

    // Get pagination params from query (validated by Zod middleware)
    const { page, limit, sortBy, sortOrder } = req.query;
    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);
    const orderBy = getSortParams(sortBy, sortOrder, 'createdAt');

    // Get userId from authenticated user
    const userId = req.user?.id;
    const whereClause = userId ? { userId } : {};

    // Get total count
    const total = await prisma.invoice.count({ where: whereClause });

    // Get paginated invoices
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      skip,
      take,
      orderBy,
      include: {
        items: true
      }
    });

    console.log(`✅ Găsite ${invoices.length} facturi din ${total} (pagina ${currentPage})`);
    res.json(formatPaginatedResponse(invoices, total, currentPage, currentLimit));
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
