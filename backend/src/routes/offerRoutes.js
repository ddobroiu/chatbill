const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Rute publice - nu necesită autentificare
router.post('/create', optionalAuth, offerController.createOffer);

// Rute protejate - necesită autentificare
router.use(authenticateToken);

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
