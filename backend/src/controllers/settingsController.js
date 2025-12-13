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
    
    // Dacă nu există în DB, încearcă să le completezi automat din iApp pe baza CUI-ului din profil
    if (!settings) {
      console.log('ℹ️ Nu există CompanySettings. Încerc auto-completare din iApp pe baza CUI-ului utilizatorului.');
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (user?.cui) {
        try {
          const payload = { cif: user.cui, email_responsabil: IAPP_EMAIL_RESPONSABIL };
          const iappResponse = await axios.post(
            `${IAPP_API_URL}/info/cif`,
            payload,
            {
              headers: {
                'Authorization': getIAppAuthHeader(),
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );

          if (iappResponse.data && iappResponse.data.status === 'SUCCESS') {
            const companyData = iappResponse.data.data.output;
            const settingsData = {
              cui: user.cui,
              name: companyData.nume || user.company || '',
              regCom: companyData.regcom || '',
              address: companyData.adresa?.completa || companyData.adresa?.adresa || '',
              city: companyData.adresa?.oras || '',
              county: companyData.adresa?.judet || '',
              postalCode: companyData.adresa?.cod_postal || '',
              phone: companyData.telefon || '',
              email: user.email
            };

            settings = await prisma.companySettings.upsert({
              where: { userId },
              update: settingsData,
              create: { userId, ...settingsData }
            });
            console.log('✅ CompanySettings create automat din iApp la prima încărcare.');
          } else {
            console.log('ℹ️ iApp nu a întors SUCCESS. Trimit setări goale.');
          }
        } catch (autoErr) {
          console.error('⚠️ Eroare auto-completare din iApp în getCompanySettings:', autoErr.response?.data || autoErr.message);
        }
      }

      // Dacă tot nu există, trimite structură goală
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
    const userId = req.user.id;
    const updates = req.body;
    
    console.log('💾 Salvare setări pentru user:', userId);
    console.log('📝 Date:', updates);
    
    // Salvează în bază de date folosind upsert
    const settings = await prisma.companySettings.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates
      }
    });
    // Dacă utilizatorul a setat telefonul (WhatsApp), sincronizează în profil pentru verificare
    if (updates.phone) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { phone: updates.phone }
        });
        console.log('✅ Telefon (WhatsApp) sincronizat în profilul utilizatorului pentru verificare');
      } catch (syncErr) {
        console.error('⚠️ Eroare sincronizare telefon în profil:', syncErr.message);
      }
    }
    
    console.log('✅ Setări salvate cu succes');

    res.json({
      success: true,
      message: 'Setări actualizate cu succes',
      settings
    });
  } catch (error) {
    console.error('❌ Eroare actualizare setări:', error);
    res.status(500).json({ 
      success: false,
      error: 'Eroare la actualizarea setărilor' 
    });
  }
}

// Auto-completare setări companie folosind CUI + iApp API
async function autoCompleteCompanySettings(req, res) {
  try {
    const userId = req.user?.id; // Optional - poate fi undefined dacă nu e autentificat
    const { cui } = req.params;
    const cleanCUI = cui.replace(/[^0-9]/g, '');

    if (!cleanCUI || cleanCUI.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'CUI invalid'
      });
    }

    console.log('🔍 Auto-completare setări companie pentru CUI:', cleanCUI, userId ? `(user: ${userId})` : '(public)');

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
        },
        timeout: 10000
      }
    );

    console.log('✅ Date companie din iApp:', JSON.stringify(iappResponse.data, null, 2));

    if (iappResponse.data && iappResponse.data.status === 'SUCCESS') {
      const companyData = iappResponse.data.data.output;

      // Pregătește datele pentru returnare
      const settingsData = {
        cui: cleanCUI,
        name: companyData.nume || '',
        address: companyData.adresa?.completa || companyData.adresa?.adresa || '',
        city: companyData.adresa?.oras || '',
        county: companyData.adresa?.judet || '',
        postalCode: companyData.adresa?.cod_postal || '',
        regCom: companyData.regcom || '',
        phone: companyData.telefon || '',
      };

      let settings = settingsData;

      // Salvează în DB doar dacă utilizatorul e autentificat
      if (userId) {
        settings = await prisma.companySettings.upsert({
          where: { userId },
          update: settingsData,
          create: {
            userId,
            ...settingsData
          }
        });
        console.log('✅ Setări salvate automat în DB pentru user:', userId);
      } else {
        console.log('ℹ️ Date returnate fără salvare (utilizator neautentificat)');
      }

      return res.json({
        success: true,
        message: userId
          ? 'Date completate automat din ANAF și salvate'
          : 'Date completate automat din ANAF',
        settings,
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
      success: false,
      error: 'Eroare la interogarea API iApp',
      details: error.response?.data?.message || error.message
    });
  }
}

// Actualizează template-urile pentru documente
async function updateTemplates(req, res) {
  try {
    const userId = req.user.id;
    const { invoice, proforma, quote } = req.body;

    // Validare
    const validTemplates = ['modern', 'classic', 'premium', 'business', 'creative'];
    
    if (invoice && !validTemplates.includes(invoice)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Template invalid pentru facturi' 
      });
    }
    
    if (proforma && !validTemplates.includes(proforma)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Template invalid pentru proformă' 
      });
    }
    
    if (quote && !validTemplates.includes(quote)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Template invalid pentru oferte' 
      });
    }

    // Actualizează sau creează setările
    const settings = await prisma.companySettings.upsert({
      where: { userId },
      update: {
        invoiceTemplate: invoice || undefined,
        proformaTemplate: proforma || undefined,
        quoteTemplate: quote || undefined,
      },
      create: {
        userId,
        invoiceTemplate: invoice || 'modern',
        proformaTemplate: proforma || 'modern',
        quoteTemplate: quote || 'modern',
      }
    });

    res.json({
      success: true,
      message: 'Template-uri salvate cu succes',
      templates: {
        invoice: settings.invoiceTemplate,
        proforma: settings.proformaTemplate,
        quote: settings.quoteTemplate
      }
    });

  } catch (error) {
    console.error('❌ Eroare salvare template-uri:', error);
    res.status(500).json({ 
      success: false,
      error: 'Eroare la salvarea template-urilor',
      details: error.message
    });
  }
}

// Obține template-urile salvate
async function getTemplates(req, res) {
  try {
    const userId = req.user.id;

    const settings = await prisma.companySettings.findUnique({
      where: { userId },
      select: {
        invoiceTemplate: true,
        proformaTemplate: true,
        quoteTemplate: true
      }
    });

    if (!settings) {
      // Returnează defaulturile
      return res.json({
        success: true,
        templates: {
          invoice: 'modern',
          proforma: 'modern',
          quote: 'modern'
        }
      });
    }

    res.json({
      success: true,
      templates: {
        invoice: settings.invoiceTemplate || 'modern',
        proforma: settings.proformaTemplate || 'modern',
        quote: settings.quoteTemplate || 'modern'
      }
    });

  } catch (error) {
    console.error('❌ Eroare obținere template-uri:', error);
    res.status(500).json({ 
      success: false,
      error: 'Eroare la obținerea template-urilor',
      details: error.message
    });
  }
}

module.exports = {
  getCompanySettings,
  updateCompanySettings,
  autoCompleteCompanySettings,
  updateTemplates,
  getTemplates
};
