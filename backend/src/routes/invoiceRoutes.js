const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

// Rute pentru facturi
router.post('/generate', invoiceController.generateInvoice);
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoice);
router.get('/:id/download', invoiceController.downloadInvoice);

module.exports = router;
