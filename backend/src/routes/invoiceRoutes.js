const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const pdfController = require('../controllers/pdfController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { createInvoiceSchema, idParamSchema, paginationSchema } = require('../validation/schemas');
const { documentGenerationLimiter, downloadLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Crearea și preview sunt publice (cu optionalAuth), restul necesită autentificare

// Rute publice - nu necesită autentificare (folosesc optionalAuth)
router.post('/create', optionalAuth, documentGenerationLimiter, validateBody(createInvoiceSchema), invoiceController.createInvoice);
router.post('/genereaza/factura', optionalAuth, documentGenerationLimiter, validateBody(createInvoiceSchema), invoiceController.createInvoice);

// PDF Routes - publice pentru testare (pot fi protejate după)
router.post('/preview', optionalAuth, apiLimiter, pdfController.previewInvoiceFromData);
router.post('/generate-pdf', optionalAuth, downloadLimiter, pdfController.generatePDFFromData);

// Rute protejate - necesită autentificare
router.use(authenticateToken);

router.get('/', apiLimiter, validateQuery(paginationSchema), invoiceController.getInvoices);
router.get('/:id', apiLimiter, validateParams(idParamSchema), invoiceController.getInvoice);
router.get('/:id/download', downloadLimiter, validateParams(idParamSchema), invoiceController.downloadInvoice);

// Modern PDF routes (protejate)
router.get('/:id/preview', apiLimiter, validateParams(idParamSchema), pdfController.previewInvoice);
router.get('/:id/pdf', downloadLimiter, validateParams(idParamSchema), pdfController.downloadInvoicePDF);

// Subcategorii istoric - necesită autentificare
router.get('/istoric/factura', apiLimiter, validateQuery(paginationSchema), invoiceController.getInvoices);
router.get('/istoric/factura/:id', apiLimiter, validateParams(idParamSchema), invoiceController.getInvoice);
router.get('/istoric/factura/:id/download', downloadLimiter, validateParams(idParamSchema), invoiceController.downloadInvoice);

module.exports = router;
