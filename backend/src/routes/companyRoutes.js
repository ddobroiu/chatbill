const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticateToken } = require('../middleware/auth');

// Protejez toate rutele
router.use(authenticateToken);

// Rute pentru companii
router.get('/search/:cui', companyController.searchCompanyByCUI);
router.post('/', companyController.createOrUpdateCompany);
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompany);
router.delete('/:id', companyController.deleteCompany);

module.exports = router;
