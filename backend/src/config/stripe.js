const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY not defined in environment variables. Stripe features will not work.');
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

module.exports = {
  stripe,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Product/Price IDs (create these in Stripe Dashboard)
  prices: {
    monthly: process.env.STRIPE_PRICE_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_ANNUAL || ''
  },

  // Success/Cancel URLs
  successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/#subscription-success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/#subscription'
};
