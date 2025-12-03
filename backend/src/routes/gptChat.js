const express = require('express');
const router = express.Router();
const gptChatController = require('../controllers/gptChatController');
const { authenticateToken } = require('../middleware/auth');

// Protejez toate rutele
router.use(authenticateToken);

// Trimite mesaj către GPT
router.post('/message', gptChatController.sendMessage);

// Obține istoric conversații
router.get('/history', gptChatController.getHistory);

// Șterge istoric conversații
router.delete('/history', gptChatController.clearHistory);

module.exports = router;
