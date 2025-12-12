const express = require('express');
const router = express.Router();
const gptChatController = require('../controllers/gptChatController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Ruta pentru mesaje - autentificare opțională (funcționează și pentru guest users)
router.post('/message', optionalAuth, gptChatController.sendMessage);

// Rutele pentru istoric necesită autentificare obligatorie
router.get('/history', authenticateToken, gptChatController.getHistory);
router.delete('/history', authenticateToken, gptChatController.clearHistory);

module.exports = router;
