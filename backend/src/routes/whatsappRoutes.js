const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { createConversationSchema, idParamSchema, paginationSchema } = require('../validation/schemas');
const { chatLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Webhook pentru verificare WhatsApp (nu necesită autentificare)
router.get('/webhook', whatsappController.verifyWebhook);

// Webhook pentru primirea mesajelor WhatsApp (nu necesită autentificare)
router.post('/webhook', whatsappController.receiveMessage);

// Protejez rutele pentru gestionare conversații WhatsApp
router.use(authenticateToken);

// Rute pentru conversații WhatsApp
router.post('/conversations', chatLimiter, validateBody(createConversationSchema), whatsappController.createConversation);
router.get('/conversations', apiLimiter, validateQuery(paginationSchema), whatsappController.getConversations);
router.get('/conversations/:id', apiLimiter, validateParams(idParamSchema), whatsappController.getConversation);
router.get('/conversations/:id/messages', apiLimiter, validateParams(idParamSchema), validateQuery(paginationSchema), whatsappController.getConversationMessages);

// Trimitere mesaj WhatsApp
router.post('/send', chatLimiter, whatsappController.sendMessage);

// Verificare telefon prin WhatsApp
router.post('/send-verification', apiLimiter, whatsappController.sendPhoneVerificationCode);
router.post('/verify-phone', apiLimiter, whatsappController.verifyPhoneCode);

module.exports = router;
