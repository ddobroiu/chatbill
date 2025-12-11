const express = require('express');
const router = express.Router();
const verifyStripeWebhook = require('../middleware/stripeWebhook');
const { handleWebhook } = require('../controllers/webhookController');
const { webhookLimiter } = require('../middleware/rateLimiter');

// Stripe webhook endpoint
// IMPORTANT: Must use raw body, not JSON parsed
router.post('/stripe', webhookLimiter, verifyStripeWebhook, handleWebhook);

module.exports = router;
