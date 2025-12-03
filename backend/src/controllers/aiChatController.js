const prisma = require('../db/prismaWrapper');
const settingsController = require('./settingsController');
const { createInvoice } = require('./invoiceController');
const axios = require('axios');

// Funcție helper pentru căutare companie după CUI
async function searchCompanyByCUI(cui) {
  try {
    const response = await axios.post(
      `${process.env.IAPP_API_URL}/info/cif`,
      {
        cif: cui,
        email_responsabil: process.env.IAPP_EMAIL_RESPONSABIL
      },
      {
        auth: {
          username: process.env.IAPP_API_USERNAME,
          password: process.env.IAPP_API_PASSWORD
        }
      }
    );

    if (response.data.status === 'SUCCESS' && response.data.data) {
      const company = response.data.data.output;
      return {
        cui: company.cif,
        name: company.nume,
        regCom: company.regcom,
        address: company.adresa.completa,
        city: company.adresa.oras,
        county: company.adresa.judet
      };
    }
    return null;
  } catch (error) {
    console.error('Eroare căutare companie:', error);
    return null;
  }
}

// Funcție pentru generare răspuns AI bazat pe context
function generateAIResponse(session, userMessage) {
  const step = session.currentStep;
  
  switch (step) {
    case 'greeting':
      return {
        message: '👋 Bună! Sunt asistentul tău pentru generarea facturilor.\n\nPentru cine dorești să emitem factura?\n1️⃣ Persoană juridică (companie)\n2️⃣ Persoană fizică',
        nextStep: 'client_type'
      };
      
    case 'client_type':
      const input = userMessage.toLowerCase().trim();
      if (input.includes('juridic') || input.includes('companie') || input === '1') {
        return {
          message: '🏢 Perfect! Pentru o companie.\n\nTe rog să-mi spui CUI-ul companiei:',
          nextStep: 'client_cui',
          updates: { clientType: 'company' }
        };
      } else if (input.includes('fizic') || input.includes('persoană') || input === '2') {
        return {
          message: '👤 OK, pentru o persoană fizică.\n\nTe rog să-mi spui:\n- Nume și prenume\n- CNP (opțional)',
          nextStep: 'client_info_individual',
          updates: { clientType: 'individual' }
        };
      }
      return {
        message: '❌ Nu am înțeles. Te rog alege:\n1️⃣ pentru companie\n2️⃣ pentru persoană fizică',
        nextStep: 'client_type'
      };
      
    case 'client_cui':
      // Extrage CUI din mesaj
      const cuiMatch = userMessage.match(/\d{6,10}/);
      if (cuiMatch) {
        return {
          message: `🔍 Verific CUI-ul ${cuiMatch[0]} în baza ANAF...\n\nUn moment...`,
          nextStep: 'verify_cui',
          updates: { clientCUI: cuiMatch[0] }
        };
      }
      return {
        message: '❌ Nu am putut identifica un CUI valid. Te rog introdu un număr de 6-10 cifre.',
        nextStep: 'client_cui'
      };
    
    case 'confirm_company':
      const confirm = userMessage.toLowerCase().trim();
      if (confirm.includes('da') || confirm === '1') {
        return {
          message: '📦 Acum să adăugăm produsele/serviciile.\n\nScrie numele produsului sau serviciului:',
          nextStep: 'add_product_name'
        };
      } else {
        return {
          message: '🔄 Încearcă din nou. Introdu CUI-ul companiei:',
          nextStep: 'client_cui'
        };
      }
    
    case 'manual_company_name':
      return {
        message: `✅ Denumire: "${userMessage}"\n\n📍 Introdu adresa companiei:`,
        nextStep: 'manual_company_address',
        tempCompany: { name: userMessage }
      };
    
    case 'manual_company_address':
      return {
        message: `✅ Adresă salvată!\n\n🏙️ Care este orașul?`,
        nextStep: 'manual_company_city',
        tempCompany: { address: userMessage }
      };
    
    case 'manual_company_city':
      return {
        message: `✅ Perfect!\n\nUltimul detaliu - în ce județ? (ex: București, Cluj, Iași)`,
        nextStep: 'manual_company_county',
        tempCompany: { city: userMessage }
      };
    
    case 'manual_company_county':
      return {
        message: '✅ Date complete!\n\n📦 Acum să adăugăm produsele/serviciile.\n\nScrie numele produsului sau serviciului:',
        nextStep: 'add_product_name',
        finalizeCompany: { county: userMessage }
      };
      
    case 'client_confirmed':
      return {
        message: '📦 Acum să adăugăm produsele/serviciile.\n\nScrie numele produsului sau serviciului:',
        nextStep: 'add_product_name'
      };
      
    case 'add_product_name':
      return {
        message: `✅ Produs: "${userMessage}"\n\n💰 Care este prețul unitar (în RON)?`,
        nextStep: 'add_product_price',
        tempProduct: { name: userMessage }
      };
      
    case 'add_product_price':
      const priceMatch = userMessage.match(/[\d,.]+/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace(',', '.'));
        return {
          message: `💰 Preț: ${price} RON\n\n📊 Câte unități?`,
          nextStep: 'add_product_quantity',
          tempProduct: { price }
        };
      }
      return {
        message: '❌ Nu am putut identifica prețul. Te rog introdu o sumă validă (ex: 100 sau 99.50)',
        nextStep: 'add_product_price'
      };
      
    case 'add_product_quantity':
      const qtyMatch = userMessage.match(/[\d,.]+/);
      if (qtyMatch) {
        const quantity = parseFloat(qtyMatch[0].replace(',', '.'));
        return {
          message: `📊 Cantitate: ${quantity}\n\n✅ Produs adăugat!\n\nDorești să adaugi alt produs?\n1️⃣ Da\n2️⃣ Nu, generează factura`,
          nextStep: 'confirm_add_more',
          productToAdd: { quantity }
        };
      }
      return {
        message: '❌ Cantitate invalidă. Te rog introdu un număr (ex: 1 sau 2.5)',
        nextStep: 'add_product_quantity'
      };
      
    case 'confirm_add_more':
      const addMore = userMessage.toLowerCase().trim();
      if (addMore.includes('da') || addMore === '1') {
        return {
          message: '📦 Perfect! Spune-mi numele următorului produs/serviciu:',
          nextStep: 'add_product_name'
        };
      } else {
        return {
          message: '📄 Generez factura...\n\nUn moment...',
          nextStep: 'generate_invoice'
        };
      }
      
    default:
      return {
        message: '❌ Ceva nu a funcționat corect. Hai să o luăm de la început.\n\nPentru cine emiți factura?\n1️⃣ Companie\n2️⃣ Persoană fizică',
        nextStep: 'client_type'
      };
  }
}

// POST /api/ai-chat/message - Trimite mesaj și primește răspuns
async function sendMessage(req, res) {
  try {
    const { sessionId, message, source = 'web', phoneNumber } = req.body;
    
    let session;
    
    // Găsește sau creează sesiune
    if (sessionId) {
      session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: { chatMessages: { orderBy: { createdAt: 'asc' } } }
      });
    }
    
    if (!session) {
      // Creează sesiune nouă
      session = await prisma.chatSession.create({
        data: {
          source,
          phoneNumber,
          currentStep: 'greeting'
        },
        include: { chatMessages: true }
      });
    }
    
    // Salvează mesajul utilizatorului
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message
      }
    });
    
    // Procesează mesajul bazat pe step curent
    const aiResponse = generateAIResponse(session, message);
    
    // Cazuri speciale care necesită API calls
    if (aiResponse.nextStep === 'verify_cui' && aiResponse.updates?.clientCUI) {
      console.log('🔍 Verific CUI:', aiResponse.updates.clientCUI);
      const companyData = await searchCompanyByCUI(aiResponse.updates.clientCUI);
      
      if (companyData) {
        // Salvează datele companiei
        await prisma.chatSession.update({
          where: { id: session.id },
          data: {
            clientCUI: companyData.cui,
            clientName: companyData.name,
            clientData: JSON.stringify(companyData),
            currentStep: 'confirm_company'
          }
        });
        
        // Răspuns cu datele companiei
        const confirmMessage = `✅ Companie găsită!\n\n🏢 ${companyData.name}\n📍 CUI: ${companyData.cui}\n📍 ${companyData.address}\n\nConfirmi aceste date?\n1️⃣ Da\n2️⃣ Nu`;
        
        const assistantMsg = await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: 'assistant',
            content: confirmMessage
          }
        });
        
        return res.json({
          success: true,
          sessionId: session.id,
          message: assistantMsg.content,
          step: 'confirm_company'
        });
      } else {
        // CUI nu a fost găsit - permite introducere manuală
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { 
            clientCUI: aiResponse.updates.clientCUI,
            currentStep: 'manual_company_name' 
          }
        });
        
        const manualMsg = await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: 'assistant',
            content: '⚠️ Nu am găsit datele în ANAF (API-ul poate fi offline).\n\nNu-i problemă! Introducem manual.\n\n🏢 Care este denumirea companiei?'
          }
        });
        
        return res.json({
          success: true,
          sessionId: session.id,
          message: manualMsg.content,
          step: 'manual_company_name'
        });
      }
    }
    
    // Generare factură
    if (session.currentStep === 'confirm_add_more' && aiResponse.nextStep === 'generate_invoice') {
      // Colectează produsele
      const productsData = JSON.parse(session.productsData || '[]');
      const clientData = JSON.parse(session.clientData || '{}');
      const settings = settingsController.getSettings();
      
      console.log('🔵 Generare factură - Produse din DB:', productsData);
      console.log('🔵 Client data:', clientData);
      
      // Generează factura folosind controller-ul existent
      const invoiceData = {
        client: {
          type: session.clientType,
          cui: clientData.cui,
          name: clientData.name,
          regCom: clientData.regCom,
          address: clientData.address,
          city: clientData.city,
          county: clientData.county
        },
        products: productsData.map(p => ({
          name: p.name,
          unit: p.unit || 'buc',
          quantity: p.quantity,
          price: p.price,
          vat: 19
        }))
      };
      
      // Creează mock req/res pentru invoiceController
      const mockReq = { body: invoiceData };
      let invoiceResult;
      
      const mockRes = {
        status: (code) => ({
          json: (data) => { invoiceResult = data; }
        }),
        json: (data) => { invoiceResult = data; }
      };
      
      await createInvoice(mockReq, mockRes);
      
      if (invoiceResult.success) {
        await prisma.chatSession.update({
          where: { id: session.id },
          data: {
            status: 'completed',
            currentStep: 'done',
            generatedInvoiceId: invoiceResult.invoice.id
          }
        });
        
        const successMsg = await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: 'assistant',
            content: `✅ Factură generată cu succes!\n\n📄 Număr: ${invoiceResult.invoice.invoiceNumber}\n💰 Total: ${invoiceResult.invoice.total.toFixed(2)} RON\n\n📥 Descarcă PDF:\n${process.env.BASE_URL || 'http://localhost:3000'}/api/invoices/${invoiceResult.invoice.id}/download`
          }
        });
        
        return res.json({
          success: true,
          sessionId: session.id,
          message: successMsg.content,
          step: 'done',
          invoice: invoiceResult.invoice
        });
      }
    }
    
    // Actualizează sesiunea cu datele din răspuns
    const updates = {};
    if (aiResponse.nextStep) updates.currentStep = aiResponse.nextStep;
    if (aiResponse.updates) Object.assign(updates, aiResponse.updates);
    
    // Gestionare date companie manuale
    if (aiResponse.tempCompany || aiResponse.finalizeCompany) {
      // Găsește mesajul anterior cu tempCompany
      const messagesWithTemp = session.chatMessages.filter(m => {
        if (!m.metadata) return false;
        try {
          const meta = JSON.parse(m.metadata);
          return meta.tempCompany;
        } catch {
          return false;
        }
      });
      
      let tempCompanyData = {};
      if (messagesWithTemp.length > 0) {
        // Merge all temp company data from previous messages
        messagesWithTemp.forEach(msg => {
          const meta = JSON.parse(msg.metadata);
          if (meta.tempCompany) {
            Object.assign(tempCompanyData, meta.tempCompany);
          }
        });
      }
      
      if (aiResponse.tempCompany) {
        Object.assign(tempCompanyData, aiResponse.tempCompany);
      }
      
      if (aiResponse.finalizeCompany) {
        // Finalizează datele companiei
        Object.assign(tempCompanyData, aiResponse.finalizeCompany);
        const fullCompanyData = {
          cui: session.clientCUI,
          name: tempCompanyData.name,
          address: tempCompanyData.address,
          city: tempCompanyData.city,
          county: tempCompanyData.county,
          regCom: ''
        };
        updates.clientData = JSON.stringify(fullCompanyData);
        updates.clientName = fullCompanyData.name;
      }
    }
    
    // Gestionare produse temporare
    if (aiResponse.tempProduct || aiResponse.productToAdd) {
      // Găsește mesajele anterioare cu tempProduct
      const messagesWithTemp = session.chatMessages.filter(m => {
        if (!m.metadata) return false;
        try {
          const meta = JSON.parse(m.metadata);
          return meta.tempProduct;
        } catch {
          return false;
        }
      });
      
      let tempData = {};
      if (messagesWithTemp.length > 0) {
        messagesWithTemp.forEach(msg => {
          const meta = JSON.parse(msg.metadata);
          if (meta.tempProduct) {
            Object.assign(tempData, meta.tempProduct);
          }
        });
      }
      
      if (aiResponse.tempProduct) {
        Object.assign(tempData, aiResponse.tempProduct);
      }
      
      if (aiResponse.productToAdd) {
        // Finalizează produsul și adaugă în listă
        Object.assign(tempData, aiResponse.productToAdd);
        const productsData = JSON.parse(session.productsData || '[]');
        productsData.push(tempData);
        updates.productsData = JSON.stringify(productsData);
        console.log('✅ Produs adăugat în lista:', tempData);
        console.log('📦 Total produse:', productsData.length);
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.chatSession.update({
        where: { id: session.id },
        data: updates
      });
    }
    
    // Salvează răspunsul AI
    const metadataObj = {};
    if (aiResponse.tempProduct) metadataObj.tempProduct = aiResponse.tempProduct;
    if (aiResponse.tempCompany) metadataObj.tempCompany = aiResponse.tempCompany;
    
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse.message,
        metadata: Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : null
      }
    });
    
    res.json({
      success: true,
      sessionId: session.id,
      message: assistantMsg.content,
      step: aiResponse.nextStep || session.currentStep
    });
    
  } catch (error) {
    console.error('Eroare AI chat:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la procesarea mesajului'
    });
  }
}

// GET /api/ai-chat/session/:id - Obține istoricul conversației
async function getSession(req, res) {
  try {
    const { id } = req.params;
    
    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sesiune negăsită'
      });
    }
    
    res.json({
      success: true,
      session
    });
    
  } catch (error) {
    console.error('Eroare obținere sesiune:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la obținerea sesiunii'
    });
  }
}

// POST /api/ai-chat/start - Începe o nouă conversație
async function startSession(req, res) {
  try {
    const { source = 'web', phoneNumber } = req.body;
    
    const session = await prisma.chatSession.create({
      data: {
        source,
        phoneNumber,
        currentStep: 'greeting'
      }
    });
    
    const greetingMsg = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: '👋 Bună! Sunt asistentul tău pentru generarea facturilor.\n\nPentru cine dorești să emitem factura?\n1️⃣ Persoană juridică (companie)\n2️⃣ Persoană fizică'
      }
    });
    
    res.json({
      success: true,
      sessionId: session.id,
      message: greetingMsg.content
    });
    
  } catch (error) {
    console.error('Eroare start sesiune:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la pornirea sesiunii'
    });
  }
}

module.exports = {
  sendMessage,
  getSession,
  startSession
};
