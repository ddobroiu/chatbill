const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Rute pentru conversații
router.post('/conversations', chatController.createConversation);
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id', chatController.getConversation);
router.get('/conversations/:id/messages', chatController.getConversationMessages);

module.exports = router;
