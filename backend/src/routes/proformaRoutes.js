const express = require('express');
const router = express.Router();
const proformaController = require('../controllers/proformaController');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { createProformaSchema, idParamSchema, paginationSchema } = require('../validation/schemas');
const { documentGenerationLimiter, downloadLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Toate rutele necesită autentificare
router.use(authenticateToken);

// Rute pentru proforme (matching cu frontend)
router.post('/', documentGenerationLimiter, validateBody(createProformaSchema), proformaController.createProforma);
router.get('/', apiLimiter, validateQuery(paginationSchema), proformaController.getProformas);
router.get('/:id', apiLimiter, validateParams(idParamSchema), proformaController.getProforma);
router.get('/:id/download', downloadLimiter, validateParams(idParamSchema), proformaController.downloadProforma);

module.exports = router;
