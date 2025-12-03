const express = require('express');
const router = express.Router();
const anafAuthController = require('../controllers/anafAuthController');

// Inițiază autentificare ANAF
router.get('/connect', anafAuthController.initiateAuth);

// Callback după autentificare
router.get('/callback', anafAuthController.handleCallback);

// Refresh token
router.post('/refresh', anafAuthController.refreshToken);

// Status conexiune
router.get('/status', anafAuthController.getStatus);

// Deconectare
router.post('/disconnect', anafAuthController.disconnect);

module.exports = router;
