const { stripe, prices, successUrl, cancelUrl } = require('../config/stripe');
const prisma = require('../db/prismaWrapper');

/**
 * Get or create Stripe customer for a user
 */
async function createOrGetStripeCustomer(user) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  // Check if customer already exists in our database
  let stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { userId: user.id }
  });

  if (stripeCustomer) {
    return stripeCustomer;
  }

  console.log('📝 Creating new Stripe customer for user:', user.email);

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      userId: user.id,
      company: user.company || '',
      cui: user.cui || ''
    }
  });

  // Save to database
  stripeCustomer = await prisma.stripeCustomer.create({
    data: {
      userId: user.id,
      stripeCustomerId: customer.id,
      email: user.email
    }
  });

  console.log('✅ Stripe customer created:', customer.id);

  return stripeCustomer;
}

/**
 * Create Stripe Checkout session for subscription
 */
async function createCheckoutSession(user, planName) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  // Get or create Stripe customer
  const stripeCustomer = await createOrGetStripeCustomer(user);

  // Get price ID for the plan
  const priceId = planName === 'annual' ? prices.annual : prices.monthly;

  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${planName}`);
  }

  console.log('🛒 Creating checkout session for user:', user.email, 'Plan:', planName);

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomer.stripeCustomerId,
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user.id,
      planName: planName
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        planName: planName
      }
    }
  });

  console.log('✅ Checkout session created:', session.id);

  return session;
}

/**
 * Create Stripe Customer Portal session
 */
async function createPortalSession(user) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { userId: user.id }
  });

  if (!stripeCustomer) {
    throw new Error('No Stripe customer found for this user');
  }

  console.log('🔧 Creating portal session for user:', user.email);

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomer.stripeCustomerId,
    return_url: process.env.FRONTEND_URL || 'http://localhost:3000'
  });

  console.log('✅ Portal session created');

  return session;
}

/**
 * Sync subscription status from Stripe to database
 */
async function syncSubscriptionStatus(userId) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { userId },
    include: { subscriptions: true }
  });

  if (!stripeCustomer) {
    return null;
  }

  // Get active subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomer.stripeCustomerId,
    status: 'active',
    limit: 1
  });

  if (subscriptions.data.length === 0) {
    // No active subscription
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'inactive',
        subscriptionTier: 'free',
        subscriptionExpiresAt: null
      }
    });
    return null;
  }

  const subscription = subscriptions.data[0];

  // Update database
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    update: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false
    },
    create: {
      customerId: stripeCustomer.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeProductId: subscription.items.data[0].price.product,
      planName: subscription.metadata.planName || 'monthly',
      planPrice: subscription.items.data[0].price.unit_amount || 0,
      currency: subscription.items.data[0].price.currency.toUpperCase(),
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false
    }
  });

  // Update user cache
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionTier: subscription.metadata.planName || 'monthly',
      subscriptionExpiresAt: new Date(subscription.current_period_end * 1000)
    }
  });

  console.log('✅ Subscription status synced for user:', userId);

  return subscription;
}

/**
 * Cancel user subscription
 */
async function cancelSubscription(userId) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { userId },
    include: {
      subscriptions: {
        where: {
          status: 'active'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      }
    }
  });

  if (!stripeCustomer || stripeCustomer.subscriptions.length === 0) {
    throw new Error('No active subscription found');
  }

  const dbSubscription = stripeCustomer.subscriptions[0];

  console.log('❌ Canceling subscription:', dbSubscription.stripeSubscriptionId);

  // Cancel subscription at period end (user keeps access until end of billing period)
  const subscription = await stripe.subscriptions.update(
    dbSubscription.stripeSubscriptionId,
    {
      cancel_at_period_end: true
    }
  );

  // Update database
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      cancelAtPeriodEnd: true
    }
  });

  console.log('✅ Subscription will cancel at period end');

  return subscription;
}

/**
 * Get current subscription for user
 */
async function getCurrentSubscription(userId) {
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { userId },
    include: {
      subscriptions: {
        where: {
          OR: [
            { status: 'active' },
            { status: 'past_due' }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      }
    }
  });

  if (!stripeCustomer || stripeCustomer.subscriptions.length === 0) {
    return null;
  }

  return stripeCustomer.subscriptions[0];
}

module.exports = {
  createOrGetStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  syncSubscriptionStatus,
  cancelSubscription,
  getCurrentSubscription
};
