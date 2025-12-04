const express = require('express');
const router = express.Router();
const {
  createProforma,
  getProformas,
  getProformaById,
  updateProformaStatus,
  deleteProforma,
  convertProformaToInvoice
} = require('../controllers/proformaController');
const { authenticateToken } = require('../middleware/auth');

// Toate rutele necesită autentificare
router.use(authenticateToken);

// Obține toate proformele
router.get('/', getProformas);

// Obține o proformă specifică
router.get('/:id', getProformaById);

// Creează proformă nouă
router.post('/', createProforma);

// Actualizează statusul unei proforme
router.patch('/:id/status', updateProformaStatus);

// Convertește proforma în factură
router.post('/:id/convert', convertProformaToInvoice);

// Șterge o proformă
router.delete('/:id', deleteProforma);

module.exports = router;
