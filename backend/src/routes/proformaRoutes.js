const express = require('express');
const router = express.Router();
const proformaController = require('../controllers/proformaController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { createProformaSchema, idParamSchema, paginationSchema } = require('../validation/schemas');
const { documentGenerationLimiter, downloadLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Rute publice - nu necesită autentificare
router.post('/', optionalAuth, documentGenerationLimiter, validateBody(createProformaSchema), proformaController.createProforma);

// Rute protejate - necesită autentificare
router.use(authenticateToken);

router.get('/', apiLimiter, validateQuery(paginationSchema), proformaController.getProformas);
router.get('/:id', apiLimiter, validateParams(idParamSchema), proformaController.getProforma);
router.get('/:id/download', downloadLimiter, validateParams(idParamSchema), proformaController.downloadProforma);

module.exports = router;
