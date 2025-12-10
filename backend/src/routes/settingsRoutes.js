const express = require('express');
const router = express.Router();
const {
  getCompanySettings,
  updateCompanySettings,
  autoCompleteCompanySettings
} = require('../controllers/settingsController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Auto-completare setări folosind CUI + iApp API (PUBLIC - nu necesită autentificare)
router.get('/autocomplete/:cui', optionalAuth, autoCompleteCompanySettings);

// Rutele de mai jos necesită autentificare
router.use(authenticateToken);

// Obține setările companiei emitente
router.get('/', getCompanySettings);

// Actualizează setările companiei emitente
router.put('/', updateCompanySettings);

module.exports = router;
