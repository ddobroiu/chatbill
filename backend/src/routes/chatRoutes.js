const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { createConversationSchema, idParamSchema, paginationSchema } = require('../validation/schemas');
const { chatLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Protejez toate rutele
router.use(authenticateToken);

// Rute pentru conversații
router.post('/conversations', chatLimiter, validateBody(createConversationSchema), chatController.createConversation);
router.get('/conversations', apiLimiter, validateQuery(paginationSchema), chatController.getConversations);
router.get('/conversations/:id', apiLimiter, validateParams(idParamSchema), chatController.getConversation);
router.get('/conversations/:id/messages', apiLimiter, validateParams(idParamSchema), validateQuery(paginationSchema), chatController.getConversationMessages);

module.exports = router;
