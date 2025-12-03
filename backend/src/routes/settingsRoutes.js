const express = require('express');
const router = express.Router();
const {
  getCompanySettings,
  updateCompanySettings,
  autoCompleteCompanySettings
} = require('../controllers/settingsController');

// Obține setările companiei emitente
router.get('/', getCompanySettings);

// Actualizează setările companiei emitente
router.put('/', updateCompanySettings);

// Auto-completare setări folosind CUI + iApp API
router.get('/autocomplete/:cui', autoCompleteCompanySettings);

module.exports = router;
