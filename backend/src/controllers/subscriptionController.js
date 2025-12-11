const stripeService = require('../services/stripeService');
const { prices } = require('../config/stripe');

/**
 * Get available subscription plans
 */
async function getPlans(req, res) {
  try {
    const plans = [
      {
        id: 'monthly',
        name: 'Lunar',
        price: 4.99,
        currency: 'EUR',
        interval: 'month',
        priceId: prices.monthly,
        features: [
          'Facturi nelimitate',
          'Chat GPT pentru facturare',
          'Toate șabloanele',
          'Integrare ANAF e-Factură'
        ]
      },
      {
        id: 'annual',
        name: 'Anual',
        price: 3.99,
        annualPrice: 47.88,
        currency: 'EUR',
        interval: 'year',
        priceId: prices.annual,
        savings: '20%',
        features: [
          'Toate beneficiile planului lunar',
          'Economisești €11.88/an',
          'Prioritate suport tehnic'
        ]
      }
    ];

    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la obținerea planurilor'
    });
  }
}

/**
 * Get current user subscription
 */
async function getCurrentSubscription(req, res) {
  try {
    const userId = req.user.id;

    const subscription = await stripeService.getCurrentSubscription(userId);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No active subscription'
      });
    }

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        planName: subscription.planName,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        price: subscription.planPrice / 100, // Convert cents to euros
        currency: subscription.currency
      }
    });
  } catch (error) {
    console.error('Error getting current subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la obținerea abonamentului'
    });
  }
}

/**
 * Create checkout session for subscription
 */
async function createCheckoutSession(req, res) {
  try {
    const userId = req.user.id;
    const { plan } = req.body;

    if (!plan || !['monthly', 'annual'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan. Must be "monthly" or "annual"'
      });
    }

    console.log('Creating checkout session for user:', userId, 'Plan:', plan);

    const session = await stripeService.createCheckoutSession(req.user, plan);

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la crearea sesiunii de checkout',
      message: error.message
    });
  }
}

/**
 * Create customer portal session
 */
async function createPortalSession(req, res) {
  try {
    const userId = req.user.id;

    const session = await stripeService.createPortalSession(req.user);

    res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la deschiderea portalului',
      message: error.message
    });
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(req, res) {
  try {
    const userId = req.user.id;

    const subscription = await stripeService.cancelSubscription(userId);

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      subscription: {
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la anularea abonamentului',
      message: error.message
    });
  }
}

/**
 * Sync subscription status from Stripe
 */
async function syncSubscription(req, res) {
  try {
    const userId = req.user.id;

    await stripeService.syncSubscriptionStatus(userId);

    res.json({
      success: true,
      message: 'Subscription status synchronized'
    });
  } catch (error) {
    console.error('Error syncing subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la sincronizarea abonamentului',
      message: error.message
    });
  }
}

module.exports = {
  getPlans,
  getCurrentSubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  syncSubscription
};
