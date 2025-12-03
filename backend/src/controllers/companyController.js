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

// Căutare companie după CUI (cu integrare API iApp)
async function searchCompanyByCUI(req, res) {
  try {
    const { cui } = req.params;
    
    // Curăță CUI-ul (elimină RO, spații, etc.)
    const cleanCUI = cui.replace(/[^0-9]/g, '');
    
    if (!cleanCUI || cleanCUI.length < 6) {
      return res.status(400).json({ error: 'CUI invalid' });
    }

    // 1. Caută în baza de date locală (dacă DB este disponibil)
    if (prisma && prisma.company) {
      try {
        let company = await prisma.company.findUnique({
          where: { cui: cleanCUI }
        });

        if (company) {
          return res.json({
            found: true,
            source: 'database',
            company: company
          });
        }
      } catch (dbError) {
        console.log('⚠️  DB nu este disponibilă, continuu cu iApp API');
      }
    }

    // 2. Dacă nu există în DB, încearcă API-ul iApp
    try {
      console.log('🔍 Căutare CUI la iApp API:', cleanCUI);
      console.log('📧 Email responsabil:', IAPP_EMAIL_RESPONSABIL);
      
      const payload = {
        cif: cleanCUI,
        email_responsabil: IAPP_EMAIL_RESPONSABIL  // Încercare cu "email_responsabil"
      };
      console.log('📤 Payload trimis:', JSON.stringify(payload));
      
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

      console.log('✅ Răspuns iApp:', JSON.stringify(iappResponse.data, null, 2));

      if (iappResponse.data && iappResponse.data.status === 'SUCCESS') {
        const companyData = iappResponse.data.data.output;
        
        return res.json({
          found: true,
          source: 'iapp_api',
          company: {
            cui: cleanCUI,
            name: companyData.nume || '',
            address: companyData.adresa?.completa || companyData.adresa?.adresa || '',
            city: companyData.adresa?.oras || '',
            county: companyData.adresa?.judet || '',
            regCom: companyData.regcom || '',
            phone: companyData.telefon || '',
            email: '',
            // Date suplimentare de la iApp
            iappData: {
              statusTVA: companyData.tva === 'Y',
              dataInregistrare: companyData.data_inregistrare || '',
              stareInregistrare: companyData.stare?.text || '',
              caen: companyData.caen || '',
              activa: companyData.activa === 'Y'
            }
          }
        });
      }
    } catch (iappError) {
      console.error('❌ Eroare iApp API:', iappError.response?.data || iappError.message);
      // Continuă - nu oprește căutarea dacă API-ul iApp nu funcționează
    }

    // 3. Dacă nu găsește nici în DB, nici la iApp
    res.json({
      found: false,
      message: 'Companie negăsită. Completați manual datele.',
      cui: cleanCUI
    });

  } catch (error) {
    console.error('Eroare căutare CUI:', error);
    res.status(500).json({ error: 'Eroare la căutarea companiei' });
  }
}

// Creare/actualizare companie
async function createOrUpdateCompany(req, res) {
  try {
    const { cui, name, address, city, county, postalCode, email, phone, regCom, iban, bank, legalRep } = req.body;
    
    const cleanCUI = cui.replace(/[^0-9]/g, '');
    
    if (!cleanCUI || !name) {
      return res.status(400).json({ error: 'CUI și nume sunt obligatorii' });
    }

    const company = await prisma.company.upsert({
      where: { cui: cleanCUI },
      update: {
        name,
        address,
        city,
        county,
        postalCode,
        email,
        phone,
        regCom,
        iban,
        bank,
        legalRep
      },
      create: {
        cui: cleanCUI,
        name,
        address,
        city,
        county,
        postalCode,
        email,
        phone,
        regCom,
        iban,
        bank,
        legalRep
      }
    });

    res.json(company);
  } catch (error) {
    console.error('Eroare salvare companie:', error);
    res.status(500).json({ error: 'Eroare la salvarea companiei' });
  }
}

// Obține toate companiile
async function getAllCompanies(req, res) {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            conversations: true,
            invoices: true
          }
        }
      }
    });

    res.json(companies);
  } catch (error) {
    console.error('Eroare obținere companii:', error);
    res.status(500).json({ error: 'Eroare la obținerea companiilor' });
  }
}

// Obține o companie specifică
async function getCompany(req, res) {
  try {
    const { id } = req.params;
    
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 10
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Companie negăsită' });
    }

    res.json(company);
  } catch (error) {
    console.error('Eroare obținere companie:', error);
    res.status(500).json({ error: 'Eroare la obținerea companiei' });
  }
}

// Șterge companie
async function deleteCompany(req, res) {
  try {
    const { id } = req.params;
    
    await prisma.company.delete({
      where: { id }
    });

    res.json({ message: 'Companie ștearsă cu succes' });
  } catch (error) {
    console.error('Eroare ștergere companie:', error);
    res.status(500).json({ error: 'Eroare la ștergerea companiei' });
  }
}

module.exports = {
  searchCompanyByCUI,
  createOrUpdateCompany,
  getAllCompanies,
  getCompany,
  deleteCompany
};
