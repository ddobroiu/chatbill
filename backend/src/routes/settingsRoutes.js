const express = require('express');
const router = express.Router();
const {
  getCompanySettings,
  updateCompanySettings,
  autoCompleteCompanySettings
} = require('../controllers/settingsController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const { updateSettingsSchema, cuiParamSchema } = require('../validation/schemas');
const { autocompleteLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Auto-completare setări folosind CUI + iApp API (PUBLIC - nu necesită autentificare)
router.get('/autocomplete/:cui', autocompleteLimiter, validateParams(cuiParamSchema), optionalAuth, autoCompleteCompanySettings);

// Rutele de mai jos necesită autentificare
router.use(authenticateToken);

// Obține setările companiei emitente
router.get('/', apiLimiter, getCompanySettings);

// Actualizează setările companiei emitente
router.put('/', apiLimiter, validateBody(updateSettingsSchema), updateCompanySettings);

module.exports = router;
