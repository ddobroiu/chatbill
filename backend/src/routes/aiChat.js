const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');
const { authenticateToken } = require('../middleware/auth');

// Protejez toate rutele
router.use(authenticateToken);

// Pornește o nouă sesiune de chat
router.post('/start', aiChatController.startSession);

// Trimite mesaj în chat
router.post('/message', aiChatController.sendMessage);

// Obține istoricul conversației
router.get('/session/:id', aiChatController.getSession);

module.exports = router;
