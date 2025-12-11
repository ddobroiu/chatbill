const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
// const { authenticateToken } = require('../middleware/auth');

// Protect routes - TEMPORAR DEZACTIVAT PENTRU DEVELOPMENT
// router.use(authenticateToken);

// Creare ofertă nouă
router.post('/create', offerController.createOffer);

// Obține toate ofertele
router.get('/', offerController.getOffers);

// Obține o ofertă specifică
router.get('/:id', offerController.getOfferById);

// Actualizează statusul ofertei
router.patch('/:id/status', offerController.updateOfferStatus);

// Șterge ofertă
router.delete('/:id', offerController.deleteOffer);

// Download PDF
router.get('/:id/download', offerController.downloadOfferPDF);

module.exports = router;
