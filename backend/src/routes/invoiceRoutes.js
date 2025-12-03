const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

// Rute pentru facturi
router.post('/create', invoiceController.createInvoice);
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoice);
router.get('/:id/download', invoiceController.downloadInvoice);

module.exports = router;
