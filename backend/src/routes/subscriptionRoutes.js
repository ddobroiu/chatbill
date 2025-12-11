const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { checkoutSchema } = require('../validation/schemas');
const subscriptionController = require('../controllers/subscriptionController');

// Public route - get available plans
router.get('/plans', subscriptionController.getPlans);

// Protected routes - require authentication
router.use(authenticateToken);

router.get('/current', subscriptionController.getCurrentSubscription);
router.post('/checkout', validateBody(checkoutSchema), subscriptionController.createCheckoutSession);
router.post('/portal', subscriptionController.createPortalSession);
router.post('/cancel', subscriptionController.cancelSubscription);
router.post('/sync', subscriptionController.syncSubscription);

module.exports = router;
