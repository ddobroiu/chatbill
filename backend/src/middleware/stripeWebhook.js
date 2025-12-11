const { stripe, webhookSecret } = require('../config/stripe');

/**
 * Middleware to verify Stripe webhook signature
 * IMPORTANT: This must be used with raw body, not JSON-parsed body
 */
async function verifyStripeWebhook(req, res, next) {
  if (!stripe || !webhookSecret) {
    console.error('❌ Stripe webhook verification failed: Stripe not configured');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('❌ Webhook verification failed: No signature header');
    return res.status(400).json({ error: 'No signature header' });
  }

  try {
    // Construct event from raw body and signature
    const event = stripe.webhooks.constructEvent(
      req.rawBody,  // Raw body stored before JSON parsing
      sig,
      webhookSecret
    );

    console.log('✅ Webhook signature verified:', event.type, event.id);

    // Attach verified event to request
    req.stripeEvent = event;
    next();
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    return res.status(400).json({
      error: 'Webhook signature verification failed',
      message: error.message
    });
  }
}

module.exports = verifyStripeWebhook;
