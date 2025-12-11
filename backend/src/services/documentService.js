/**
 * Document Service - Shared logic for Invoice and Proforma
 * Handles common operations like calculations, validation, and PDF generation
 */

const prisma = require('../db/prismaWrapper');
const logger = require('../config/logger');
const { NotFoundError, BadRequestError } = require('../utils/errors');

/**
 * Generate unique document number
 * @param {string} prefix - Document prefix (e.g., 'INV', 'PRO')
 * @returns {string} Generated document number
 */
function generateDocumentNumber(prefix = '') {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return prefix ? `${prefix}-${year}${month}${day}${random}` : `${year}${month}${day}${random}`;
}

/**
 * Get company settings for a user
 * @param {number} userId - User ID
 * @returns {Promise<object>} Company settings
 * @throws {NotFoundError} If settings not found
 */
async function getCompanySettings(userId) {
  if (!prisma) {
    throw new Error('Baza de date nu este configurată');
  }

  const companySettings = await prisma.companySettings.findUnique({
    where: { userId },
  });

  if (!companySettings) {
    throw new NotFoundError('Setările companiei', 'pentru utilizator');
  }

  return companySettings;
}

/**
 * Calculate item totals with VAT
 * @param {Array} products - Array of products
 * @param {boolean} isVatPayer - Whether company is VAT payer
 * @param {number} defaultVatRate - Default VAT rate (percentage)
 * @returns {Array} Calculated items data
 */
function calculateItemTotals(products, isVatPayer = true, defaultVatRate = 19) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new BadRequestError('Produsele sunt obligatorii și trebuie să fie un array nevid');
  }

  return products.map(product => {
    const quantity = parseFloat(product.quantity);
    const price = parseFloat(product.price);

    if (isNaN(quantity) || quantity <= 0) {
      throw new BadRequestError(`Cantitate invalidă pentru produsul: ${product.name || 'necunoscut'}`);
    }

    if (isNaN(price) || price < 0) {
      throw new BadRequestError(`Preț invalid pentru produsul: ${product.name || 'necunoscut'}`);
    }

    // If not VAT payer, VAT = 0
    const vatRate = isVatPayer ? (parseFloat(product.vat) / 100) : 0;

    const subtotal = quantity * price;
    const vatAmount = subtotal * vatRate;
    const total = subtotal + vatAmount;

    return {
      name: product.name,
      description: product.description || product.name,
      unit: product.unit || 'buc',
      quantity,
      unitPrice: price,
      price, // Keep for backwards compatibility
      vatRate: vatRate * 100, // Store as percentage
      subtotal,
      vatAmount,
      total
    };
  });
}

/**
 * Calculate document totals
 * @param {Array} items - Calculated items
 * @returns {object} Subtotal, VAT, and total amounts
 */
function calculateDocumentTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalVat = items.reduce((sum, item) => sum + item.vatAmount, 0);
  const total = items.reduce((sum, item) => sum + item.total, 0);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}

/**
 * Prepare provider data from company settings
 * @param {object} settings - Company settings
 * @returns {object} Provider data for document
 */
function prepareProviderData(settings) {
  return {
    name: settings.companyName,
    cui: settings.cui,
    registrationNumber: settings.registrationNumber || '',
    address: settings.address || '',
    city: settings.city || '',
    county: settings.county || '',
    country: settings.country || 'România',
    postalCode: settings.postalCode || '',
    phone: settings.phone || '',
    email: settings.email || '',
    bankName: settings.bankName || '',
    iban: settings.iban || '',
    legalRepresentative: settings.legalRepresentative || '',
    isVatPayer: settings.isVatPayer !== false,
    vatRate: settings.vatRate || 19
  };
}

/**
 * Prepare client data from request
 * @param {object} clientData - Client data from request
 * @returns {object} Formatted client data
 */
function prepareClientData(clientData) {
  if (!clientData) {
    throw new BadRequestError('Datele clientului sunt obligatorii');
  }

  const client = {
    type: clientData.type || 'company',
    name: clientData.name || '',
    address: clientData.address || '',
    city: clientData.city || '',
    county: clientData.county || '',
    country: clientData.country || 'România',
    phone: clientData.phone || '',
    email: clientData.email || ''
  };

  // Company-specific fields
  if (client.type === 'company') {
    if (!clientData.name || !clientData.cui) {
      throw new BadRequestError('Numele companiei și CUI-ul sunt obligatorii pentru clienți tip companie');
    }
    client.cui = clientData.cui;
    client.registrationNumber = clientData.registrationNumber || '';
  }
  // Individual-specific fields
  else if (client.type === 'individual') {
    if (!clientData.firstName || !clientData.lastName) {
      throw new BadRequestError('Numele și prenumele sunt obligatorii pentru clienți persoane fizice');
    }
    client.firstName = clientData.firstName;
    client.lastName = clientData.lastName;
    client.cnp = clientData.cnp || '';
    client.idSeries = clientData.idSeries || '';
    client.idNumber = clientData.idNumber || '';
    client.name = `${clientData.firstName} ${clientData.lastName}`;
  }

  return client;
}

/**
 * Get next document number from series
 * @param {object} settings - Company settings
 * @param {string} documentType - 'invoice', 'proforma', or 'quote'
 * @returns {Promise<string>} Next document number
 */
async function getNextDocumentNumber(settings, documentType = 'invoice') {
  const seriesField = `${documentType}Series`;
  const startNumberField = `${documentType}StartNumber`;

  const series = settings[seriesField] || 'DOC';
  const startNumber = settings[startNumberField] || 1;

  // Count existing documents of this type for this user
  let count = 0;
  if (documentType === 'invoice') {
    count = await prisma.invoice.count({
      where: { userId: settings.userId }
    });
  } else if (documentType === 'proforma') {
    count = await prisma.proforma.count({
      where: { userId: settings.userId }
    });
  }

  const documentNumber = startNumber + count;
  return `${series}${String(documentNumber).padStart(6, '0')}`;
}

/**
 * Log document action
 * @param {string} type - Document type ('invoice' or 'proforma')
 * @param {number} userId - User ID
 * @param {number|string} documentId - Document ID
 * @param {string} action - Action performed
 * @param {string} status - Status of action
 */
function logDocumentAction(type, userId, documentId, action, status = 'success') {
  logger.logDocument(type, userId, documentId, action, status);
}

module.exports = {
  generateDocumentNumber,
  getCompanySettings,
  calculateItemTotals,
  calculateDocumentTotals,
  prepareProviderData,
  prepareClientData,
  getNextDocumentNumber,
  logDocumentAction
};
