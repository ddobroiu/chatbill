const express = require('express');
const router = express.Router();
const proformaController = require('../controllers/proformaController');
const { authenticateToken } = require('../middleware/auth');

// Toate rutele necesită autentificare
router.use(authenticateToken);

// Subcategorii pentru generare și istoric proforme
router.post('/genereaza/proforma', proformaController.createProforma);
router.get('/istoric/proforma', proformaController.getProformas);
router.get('/istoric/proforma/:id', proformaController.getProforma);
router.get('/istoric/proforma/:id/download', proformaController.downloadProforma);

module.exports = router;
