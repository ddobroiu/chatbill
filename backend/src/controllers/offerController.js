const prisma = require('../db/prismaWrapper');
const { ValidationError } = require('../utils/errors');

// Helper pentru generare număr ofertă
async function generateOfferNumber(userId) {
  // Obține setările utilizatorului pentru seria și numărul de început
  const settings = await prisma.companySettings.findUnique({
    where: { userId }
  });
  
  const series = settings?.quoteSeries || 'OFF';
  const startNumber = settings?.quoteStartNumber || 1;
  
  // Găsește ultima ofertă pentru a determina următorul număr
  const lastOffer = await prisma.offer.findFirst({
    where: {
      offerNumber: {
        startsWith: series
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  let nextNumber = startNumber;
  
  if (lastOffer) {
    // Extrage numărul din oferta anterioară
    const match = lastOffer.offerNumber.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  // Format: SERIA-YYYY-NUMĂR (ex: OFF-2025-0001)
  const year = new Date().getFullYear();
  const paddedNumber = String(nextNumber).padStart(4, '0');
  return `${series}-${year}-${paddedNumber}`;
}

// Creare ofertă
exports.createOffer = async (req, res, next) => {
  try {
    const userId = req.user?.id || '0f3290c5-b5d7-4a2d-b4bd-142b6f3d0b70'; // Demo user
    const { title, validity, paymentTerms, delivery, notes, client, products } = req.body;
    
    // Validare date de bază
    if (!title || !client || !products || products.length === 0) {
      throw new ValidationError('Lipsesc date obligatorii (titlu, client, produse)');
    }
    
    // Obține setările companiei emitente
    const settings = await prisma.companySettings.findUnique({
      where: { userId }
    });
    
    if (!settings || !settings.name || !settings.cui) {
      throw new ValidationError('Vă rugăm să configurați datele companiei în Setări înainte de a genera oferte');
    }
    
    // Calculează totalurile
    let subtotal = 0;
    let tvaAmount = 0;
    
    const offerItems = products.map(product => {
      const productSubtotal = product.quantity * product.price;
      const productVAT = productSubtotal * (product.vatRate / 100);
      const productTotal = productSubtotal + productVAT;
      
      subtotal += productSubtotal;
      tvaAmount += productVAT;
      
      return {
        name: product.name,
        description: product.description || null,
        unit: product.unit || 'buc',
        quantity: product.quantity,
        price: product.price,
        vatRate: product.vatRate / 100, // Convertește din procent
        subtotal: productSubtotal,
        vatAmount: productVAT,
        total: productTotal
      };
    });
    
    const total = subtotal + tvaAmount;
    
    // Generează număr ofertă
    const offerNumber = await generateOfferNumber(userId);
    
    // Calculează data de valabilitate
    const issueDate = new Date();
    const validUntil = new Date(issueDate);
    validUntil.setDate(validUntil.getDate() + (validity || 30));
    
    // Determină tipul clientului și pregătește datele
    const clientData = client.type === 'company' ? {
      clientType: 'company',
      clientName: client.name,
      clientCUI: client.cui,
      clientRegCom: client.regCom || null,
      clientAddress: client.address || null,
      clientCity: client.city || null,
      clientCounty: client.county || null,
      clientEmail: client.email || null,
      clientPhone: client.phone || null
    } : {
      clientType: 'individual',
      clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      clientFirstName: client.firstName,
      clientLastName: client.lastName,
      clientCNP: client.cnp || null,
      clientEmail: client.email || null,
      clientPhone: client.phone || null,
      clientAddress: client.address || null,
      clientCity: client.city || null,
      clientCounty: client.county || null
    };
    
    // Creează oferta în baza de date
    const offer = await prisma.offer.create({
      data: {
        offerNumber,
        title,
        validity: validity || 30,
        paymentTerms: paymentTerms || '30days',
        delivery: delivery || null,
        issueDate,
        validUntil,
        subtotal,
        tvaAmount,
        total,
        status: 'draft',
        
        // Date furnizor (snapshot)
        providerName: settings.name,
        providerCUI: settings.cui,
        providerRegCom: settings.regCom || '',
        providerAddress: settings.address || '',
        providerCity: settings.city || '',
        providerCounty: settings.county || '',
        providerEmail: settings.email || '',
        providerPhone: settings.phone || '',
        providerBank: settings.bank || '',
        providerIban: settings.iban || '',
        
        // Date client
        ...clientData,
        
        // Metadata
        template: req.body.template || 'modern',
        notes: notes || null,
        
        // Creează produsele asociate
        items: {
          create: offerItems
        }
      },
      include: {
        items: true
      }
    });
    
    console.log(`✅ Ofertă ${offerNumber} creată cu succes`);
    
    res.json({
      success: true,
      message: 'Ofertă creată cu succes',
      offer: {
        id: offer.id,
        offerNumber: offer.offerNumber,
        total: offer.total,
        validUntil: offer.validUntil
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// Obține lista de oferte
exports.getOffers = async (req, res, next) => {
  try {
    const userId = req.user?.id || '0f3290c5-b5d7-4a2d-b4bd-142b6f3d0b70';
    
    const offers = await prisma.offer.findMany({
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      offers
    });
    
  } catch (error) {
    next(error);
  }
};

// Obține o ofertă specifică
exports.getOfferById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        items: true
      }
    });
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Oferta nu a fost găsită'
      });
    }
    
    res.json({
      success: true,
      offer
    });
    
  } catch (error) {
    next(error);
  }
};

// Actualizează statusul ofertei
exports.updateOfferStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Status invalid');
    }
    
    const offer = await prisma.offer.update({
      where: { id },
      data: { status }
    });
    
    res.json({
      success: true,
      message: 'Status actualizat',
      offer
    });
    
  } catch (error) {
    next(error);
  }
};

// Șterge ofertă
exports.deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.offer.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Oferta a fost ștearsă'
    });
    
  } catch (error) {
    next(error);
  }
};

// Download PDF (placeholder - va fi implementat mai târziu)
exports.downloadOfferPDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: { items: true }
    });
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Oferta nu a fost găsită'
      });
    }
    
    // TODO: Generare PDF similar cu invoiceController
    res.json({
      success: true,
      message: 'Funcționalitatea de download PDF va fi adăugată în curând',
      offer
    });
    
  } catch (error) {
    next(error);
  }
};
