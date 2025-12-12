const crypto = require('crypto');

/**
 * Generează un cod de verificare de 6 cifre
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Timpul de expirare pentru cod (10 minute)
 */
function getCodeExpiry() {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}

/**
 * Verifică dacă codul este valid și nu a expirat
 */
function isCodeValid(storedCode, providedCode, expiry) {
  if (!storedCode || !providedCode || !expiry) {
    return false;
  }

  // Verifică dacă codul a expirat
  if (new Date() > new Date(expiry)) {
    return false;
  }

  // Verifică dacă codul matches
  return storedCode === providedCode;
}

module.exports = {
  generateVerificationCode,
  getCodeExpiry,
  isCodeValid
};
