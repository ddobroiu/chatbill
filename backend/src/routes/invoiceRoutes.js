const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');

// Toate rutele necesită autentificare
router.use(authenticateToken);

// Rute pentru facturi
router.post('/', invoiceController.createInvoice); // POST /api/invoices
router.post('/create', invoiceController.createInvoice); // POST /api/invoices/create (backwards compatibility)
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoice);
router.get('/:id/download', invoiceController.downloadInvoice);

module.exports = router;
