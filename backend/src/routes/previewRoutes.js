const express = require('express');
const router = express.Router();
const previewController = require('../controllers/previewController');
const { authenticateToken } = require('../middleware/auth');

// Toate rutele necesită autentificare
router.use(authenticateToken);

// Preview routes
router.post('/invoice', previewController.generateInvoicePreview);
router.post('/proforma', previewController.generateProformaPreview);

module.exports = router;
