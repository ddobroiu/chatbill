const express = require('express');
const router = express.Router();
const anafAuthController = require('../controllers/anafAuthController');
const { authenticateToken } = require('../middleware/auth');

// Inițiază autentificare ANAF (protejat)
router.get('/connect', authenticateToken, anafAuthController.initiateAuth);

// Callback după autentificare (NU e protejat - vine de la ANAF)
router.get('/callback', anafAuthController.handleCallback);

// Refresh token (protejat)
router.post('/refresh', authenticateToken, anafAuthController.refreshToken);

// Status conexiune (protejat)
router.get('/status', authenticateToken, anafAuthController.getStatus);

// Deconectare (protejat)
router.post('/disconnect', authenticateToken, anafAuthController.disconnect);

module.exports = router;
