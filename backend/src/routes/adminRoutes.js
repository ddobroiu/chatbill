const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin login (no auth required)
router.post('/login', adminController.login);

// Admin stats (requires admin auth)
router.get('/stats', adminController.verifyAdmin, adminController.getStats);

module.exports = router;
