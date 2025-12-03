const prisma = require('../db/prismaWrapper');
const axios = require('axios');

// Configurare iApp API
const IAPP_API_URL = process.env.IAPP_API_URL || 'https://api.my.iapp.ro';
const IAPP_API_USERNAME = process.env.IAPP_API_USERNAME;
const IAPP_API_PASSWORD = process.env.IAPP_API_PASSWORD;
const IAPP_EMAIL_RESPONSABIL = process.env.IAPP_EMAIL_RESPONSABIL;

// Funcție pentru autentificare Basic Auth
function getIAppAuthHeader() {
  const credentials = Buffer.from(`${IAPP_API_USERNAME}:${IAPP_API_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

// Setări companie (emitent facturi) - stocate în fișier sau variabile de mediu
let companySettings = {
  cui: process.env.COMPANY_CUI || '',
  name: process.env.COMPANY_NAME || '',
  address: process.env.COMPANY_ADDRESS || '',
  city: process.env.COMPANY_CITY || '',
  county: process.env.COMPANY_COUNTY || '',
  regCom: process.env.COMPANY_REG_COM || '',
  phone: process.env.COMPANY_PHONE || '',
  email: process.env.COMPANY_EMAIL || '',
  bank: process.env.COMPANY_BANK || '',
  iban: process.env.COMPANY_IBAN || '',
  capital: process.env.COMPANY_CAPITAL || '',
};

// Obține setările companiei emitente
async function getCompanySettings(req, res) {
  try {
    const userId = req.user.id;
    
    // Încearcă să obții settings din DB
    let settings = await prisma.companySettings.findUnique({
      where: { userId }
    });
    
    // Dacă nu există, returnează setări goale
    if (!settings) {
      settings = {
        cui: '',
        name: '',
        address: '',
        city: '',
        county: '',
        regCom: '',
        phone: '',
        email: '',
        bank: '',
        iban: '',
        capital: '',
        legalRep: ''
      };
    }
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Eroare obținere setări:', error);
    res.status(500).json({ 
      success: false,
      error: 'Eroare la obținerea setărilor' 
    });
  }
}

// Actualizează setările companiei emitente
async function updateCompanySettings(req, res) {
  try {
    const updates = req.body;
    
    // Actualizează setările în memorie
    companySettings = {
      ...companySettings,
      ...updates
    };

    // TODO: Salvează în bază de date când va fi configurată
    // if (prisma) {
    //   await prisma.settings.upsert({...});
    // }

    res.json({
      success: true,
      message: 'Setări actualizate cu succes',
      settings: companySettings
    });
  } catch (error) {
    console.error('Eroare actualizare setări:', error);
    res.status(500).json({ error: 'Eroare la actualizarea setărilor' });
  }
}

// Auto-completare setări companie folosind CUI + iApp API
async function autoCompleteCompanySettings(req, res) {
  try {
    const { cui } = req.params;
    const cleanCUI = cui.replace(/[^0-9]/g, '');
    
    if (!cleanCUI || cleanCUI.length < 6) {
      return res.status(400).json({ error: 'CUI invalid' });
    }

    console.log('🔍 Auto-completare setări companie pentru CUI:', cleanCUI);

    // Interogare iApp API
    const payload = {
      cif: cleanCUI,
      email_responsabil: IAPP_EMAIL_RESPONSABIL
    };

    const iappResponse = await axios.post(
      `${IAPP_API_URL}/info/cif`,
      payload,
      {
        headers: {
          'Authorization': getIAppAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Date companie din iApp:', JSON.stringify(iappResponse.data, null, 2));

    if (iappResponse.data && iappResponse.data.status === 'SUCCESS') {
      const companyData = iappResponse.data.data.output;
      
      // Actualizează setările cu datele de la iApp
      companySettings = {
        ...companySettings,
        cui: cleanCUI,
        name: companyData.nume || '',
        address: companyData.adresa?.completa || companyData.adresa?.adresa || '',
        city: companyData.adresa?.oras || '',
        county: companyData.adresa?.judet || '',
        regCom: companyData.regcom || '',
        phone: companyData.telefon || companySettings.phone, // Păstrează phone-ul dacă API nu returnează
        // Email, IBAN, Bancă rămân cele existente (nu vin din API)
      };

      return res.json({
        success: true,
        message: 'Date completate automat din ANAF',
        settings: companySettings,
        iappData: {
          statusTVA: companyData.tva === 'Y',
          dataInregistrare: companyData.data_inregistrare || '',
          stareInregistrare: companyData.stare?.text || '',
          caen: companyData.caen || '',
          activa: companyData.activa === 'Y'
        }
      });
    }

    res.status(404).json({
      success: false,
      message: 'Companie negăsită în ANAF'
    });

  } catch (error) {
    console.error('❌ Eroare auto-completare setări:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Eroare la interogarea API iApp',
      details: error.response?.data?.message || error.message
    });
  }
}

module.exports = {
  getCompanySettings,
  updateCompanySettings,
  autoCompleteCompanySettings,
  getSettings: () => companySettings  // Pentru a fi folosit de alte controllere
};
