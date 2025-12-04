const prisma = require('../db/prismaWrapper');
const fs = require('fs');
const path = require('path');
const { createProformaPDF } = require('../services/pdfGenerator');

// Director pentru salvarea proformelor PDF
const proformasDir = path.join(__dirname, '../../proformas');
if (!fs.existsSync(proformasDir)) {
  fs.mkdirSync(proformasDir, { recursive: true });
}

// Generare număr proformă unic
function generateProformaNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PRO${year}${month}${day}${random}`;
}

// Generare proformă nouă
async function createProforma(req, res) {
  console.log('🔵 createProforma apelat cu body:', JSON.stringify(req.body, null, 2));
  try {
    if (!prisma) {
      console.log('❌ Prisma nu este disponibil');
      return res.status(503).json({ 
        success: false, 
        error: 'Baza de date nu este configurată' 
      });
    }

    const { client, products, validDays = 30, template: requestTemplate } = req.body;
    const userId = req.user.id;

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

    // Obține setările companiei emitente
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
      const vatRate = parseFloat(product.vat) / 100;
      
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
    const proformaSubtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
    const proformaVatAmount = itemsData.reduce((sum, item) => sum + item.vatAmount, 0);
    const proformaTotal = proformaSubtotal + proformaVatAmount;

    // Calculează data validitate
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + parseInt(validDays));

    // Pregătește datele pentru proformă
    const proformaData = {
      proformaNumber: generateProformaNumber(),
      subtotal: proformaSubtotal,
      tvaAmount: proformaVatAmount,
      total: proformaTotal,
      issueDate: new Date(),
      validUntil: validUntil,
      status: 'draft',
      template: finalTemplate,
      
      // Date emitent (din setări)
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

    // Salvează proforma în baza de date
    console.log('🔵 Se salvează proforma în DB...');
    const proforma = await prisma.proforma.create({
      data: proformaData,
      include: {
        items: true
      }
    });
    console.log('✅ Proformă salvată cu ID:', proforma.id);

    // Generează PDF
    console.log('🔵 Se generează PDF...');
    const pdfResult = await generateProformaPDF(proforma);
    console.log('✅ PDF generat:', pdfResult.pdfPath);
    
    // Actualizează cu calea PDF
    const updatedProforma = await prisma.proforma.update({
      where: { id: proforma.id },
      data: { pdfPath: pdfResult.pdfPath },
      include: {
        items: true
      }
    });

    res.json({
      success: true,
      message: 'Proformă generată cu succes!',
      proforma: updatedProforma
    });

  } catch (error) {
    console.error('❌ Eroare generare proformă:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Eroare la generarea proformei.' 
    });
  }
}

// Generare PDF pentru proformă existentă
async function generateProformaPDF(proforma) {
  try {
    console.log('🔵 Începe generarea PDF pentru:', proforma.proformaNumber, 'Template:', proforma.template);
    
    const companySettings = {
      name: proforma.providerName,
      cui: proforma.providerCUI,
      regCom: proforma.providerRegCom,
      address: proforma.providerAddress,
      city: proforma.providerCity,
      county: proforma.providerCounty,
      phone: proforma.providerPhone,
      email: proforma.providerEmail,
      bank: proforma.providerBank,
      iban: proforma.providerIban,
      capital: proforma.providerCapital
    };
    
    console.log('🔵 Generare PDF cu pdfmake...');
    const pdfBuffer = await createProformaPDF(proforma, companySettings, proforma.template);
    
    // Salvează PDF-ul pe disc
    const fileName = `${proforma.proformaNumber}.pdf`;
    const filePath = path.join(proformasDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    
    const pdfPath = `/proformas/${fileName}`;
    
    return {
      success: true,
      pdfPath,
      fileName
    };
    
  } catch (error) {
    console.error('❌ Eroare generare PDF proformă:', error);
    throw error;
  }
}

// Obține toate proformele utilizatorului
async function getProformas(req, res) {
  try {
    const userId = req.user.id;
    
    const proformas = await prisma.proforma.findMany({
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      proformas
    });
  } catch (error) {
    console.error('Eroare obținere proforme:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Eroare la obținerea proformelor.' 
    });
  }
}

// Obține o proformă specifică după ID
async function getProformaById(req, res) {
  try {
    const { id } = req.params;

    const proforma = await prisma.proforma.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!proforma) {
      return res.status(404).json({ 
        success: false, 
        error: 'Proforma nu a fost găsită.' 
      });
    }

    res.json({
      success: true,
      proforma
    });
  } catch (error) {
    console.error('Eroare obținere proformă:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Eroare la obținerea proformei.' 
    });
  }
}

// Actualizează statusul proformei
async function updateProformaStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'converted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status invalid.' 
      });
    }

    const proforma = await prisma.proforma.update({
      where: { id },
      data: { status },
      include: {
        items: true
      }
    });

    res.json({
      success: true,
      message: 'Status proformă actualizat cu succes!',
      proforma
    });
  } catch (error) {
    console.error('Eroare actualizare status proformă:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Eroare la actualizarea statusului.' 
    });
  }
}

// Șterge o proformă
async function deleteProforma(req, res) {
  try {
    const { id } = req.params;

    const proforma = await prisma.proforma.findUnique({
      where: { id }
    });

    if (!proforma) {
      return res.status(404).json({ 
        success: false, 
        error: 'Proforma nu a fost găsită.' 
      });
    }

    // Șterge PDF-ul de pe disc dacă există
    if (proforma.pdfPath) {
      const pdfFilePath = path.join(proformasDir, path.basename(proforma.pdfPath));
      if (fs.existsSync(pdfFilePath)) {
        fs.unlinkSync(pdfFilePath);
      }
    }

    // Șterge din baza de date
    await prisma.proforma.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Proforma a fost ștearsă cu succes!'
    });
  } catch (error) {
    console.error('Eroare ștergere proformă:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Eroare la ștergerea proformei.' 
    });
  }
}

// Convertește proforma în factură
async function convertProformaToInvoice(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const proforma = await prisma.proforma.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!proforma) {
      return res.status(404).json({ 
        success: false, 
        error: 'Proforma nu a fost găsită.' 
      });
    }

    if (proforma.convertedToInvoiceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Această proformă a fost deja convertită în factură.' 
      });
    }

    // Generare număr factură
    const { generateInvoiceNumber } = require('./invoiceController');
    const invoiceNumber = generateInvoiceNumber();

    // Copiază datele din proformă în factură
    const invoiceData = {
      invoiceNumber,
      subtotal: proforma.subtotal,
      tvaAmount: proforma.tvaAmount,
      total: proforma.total,
      issueDate: new Date(),
      status: 'generated',
      template: proforma.template,
      
      providerName: proforma.providerName,
      providerCUI: proforma.providerCUI,
      providerRegCom: proforma.providerRegCom,
      providerAddress: proforma.providerAddress,
      providerCity: proforma.providerCity,
      providerCounty: proforma.providerCounty,
      providerPhone: proforma.providerPhone,
      providerEmail: proforma.providerEmail,
      providerBank: proforma.providerBank,
      providerIban: proforma.providerIban,
      providerCapital: proforma.providerCapital,
      
      clientType: proforma.clientType,
      clientName: proforma.clientName,
      clientCUI: proforma.clientCUI,
      clientRegCom: proforma.clientRegCom,
      clientCNP: proforma.clientCNP,
      clientFirstName: proforma.clientFirstName,
      clientLastName: proforma.clientLastName,
      clientAddress: proforma.clientAddress,
      clientCity: proforma.clientCity,
      clientCounty: proforma.clientCounty,
      
      items: {
        create: proforma.items.map(item => ({
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          vatRate: item.vatRate,
          subtotal: item.subtotal,
          vatAmount: item.vatAmount,
          total: item.total
        }))
      }
    };

    // Creează factura
    const invoice = await prisma.invoice.create({
      data: invoiceData,
      include: {
        items: true
      }
    });

    // Actualizează proforma cu ID-ul facturii
    await prisma.proforma.update({
      where: { id },
      data: { 
        convertedToInvoiceId: invoice.id,
        status: 'converted'
      }
    });

    // Generează PDF pentru factură
    const { generateInvoicePDF } = require('./invoiceController');
    const pdfResult = await generateInvoicePDF(invoice);
    
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfPath: pdfResult.pdfPath },
      include: {
        items: true
      }
    });

    res.json({
      success: true,
      message: 'Proforma a fost convertită în factură cu succes!',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Eroare conversie proformă în factură:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Eroare la conversia proformei în factură.' 
    });
  }
}

module.exports = {
  createProforma,
  getProformas,
  getProformaById,
  updateProformaStatus,
  deleteProforma,
  convertProformaToInvoice,
  generateProformaNumber
};
