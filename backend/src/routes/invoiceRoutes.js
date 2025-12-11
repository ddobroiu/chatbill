const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { createInvoiceSchema, idParamSchema, paginationSchema } = require('../validation/schemas');
const { documentGenerationLimiter, downloadLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Toate rutele necesită autentificare
router.use(authenticateToken);

// Rute pentru facturi
router.post('/create', documentGenerationLimiter, validateBody(createInvoiceSchema), invoiceController.createInvoice);
router.get('/', apiLimiter, validateQuery(paginationSchema), invoiceController.getInvoices);
router.get('/:id', apiLimiter, validateParams(idParamSchema), invoiceController.getInvoice);
router.get('/:id/download', downloadLimiter, validateParams(idParamSchema), invoiceController.downloadInvoice);

// Subcategorii pentru generare și istoric facturi
router.post('/genereaza/factura', documentGenerationLimiter, validateBody(createInvoiceSchema), invoiceController.createInvoice);
router.get('/istoric/factura', apiLimiter, validateQuery(paginationSchema), invoiceController.getInvoices);
router.get('/istoric/factura/:id', apiLimiter, validateParams(idParamSchema), invoiceController.getInvoice);
router.get('/istoric/factura/:id/download', downloadLimiter, validateParams(idParamSchema), invoiceController.downloadInvoice);

module.exports = router;
