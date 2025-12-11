const prisma = require('../db/prismaWrapper');

/**
 * Main webhook handler - routes events to specific handlers
 */
async function handleWebhook(req, res) {
  const event = req.stripeEvent;

  try {
    // Check if event already processed (idempotency)
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id }
    });

    if (existingEvent && existingEvent.processed) {
      console.log('ℹ️  Event already processed:', event.id);
      return res.json({ received: true, message: 'Event already processed' });
    }

    // Log event
    let webhookRecord = existingEvent || await prisma.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        eventData: JSON.stringify(event.data)
      }
    });

    console.log('📥 Processing webhook event:', event.type, event.id);

    // Route to appropriate handler
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      default:
        console.log('ℹ️  Unhandled event type:', event.type);
    }

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        processed: true,
        processedAt: new Date()
      }
    });

    console.log('✅ Webhook processed successfully:', event.type);

    return res.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);

    // Store error
    try {
      await prisma.webhookEvent.updateMany({
        where: { stripeEventId: event.id },
        data: {
          error: error.message,
          processed: false
        }
      });
    } catch (dbError) {
      console.error('Failed to store webhook error:', dbError);
    }

    return res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
}

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(subscription) {
  console.log('🎉 Subscription created:', subscription.id);

  // Find user by Stripe customer ID
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: subscription.customer },
    include: { user: true }
  });

  if (!stripeCustomer) {
    console.error('Stripe customer not found:', subscription.customer);
    return;
  }

  // Create subscription record
  await prisma.subscription.create({
    data: {
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

  // Update user subscription cache
  await prisma.user.update({
    where: { id: stripeCustomer.userId },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionTier: subscription.metadata.planName || 'monthly',
      subscriptionExpiresAt: new Date(subscription.current_period_end * 1000)
    }
  });

  console.log('✅ Subscription created in database for user:', stripeCustomer.userId);

  // TODO: Send welcome email
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Subscription updated:', subscription.id);

  // Find subscription in database
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    include: { customer: { include: { user: true } } }
  });

  if (!dbSubscription) {
    console.error('Subscription not found in database:', subscription.id);
    return;
  }

  // Update subscription record
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null
    }
  });

  // Update user cache
  await prisma.user.update({
    where: { id: dbSubscription.customer.userId },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionExpiresAt: new Date(subscription.current_period_end * 1000)
    }
  });

  console.log('✅ Subscription updated in database');
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription) {
  console.log('🗑️  Subscription deleted:', subscription.id);

  // Find subscription in database
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    include: { customer: { include: { user: true } } }
  });

  if (!dbSubscription) {
    console.error('Subscription not found in database:', subscription.id);
    return;
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: 'canceled',
      canceledAt: new Date()
    }
  });

  // Update user to free tier
  await prisma.user.update({
    where: { id: dbSubscription.customer.userId },
    data: {
      subscriptionStatus: 'inactive',
      subscriptionTier: 'free',
      subscriptionExpiresAt: null
    }
  });

  console.log('✅ Subscription canceled in database');

  // TODO: Send cancellation email
}

/**
 * Handle payment succeeded event
 */
async function handlePaymentSucceeded(invoice) {
  console.log('💰 Payment succeeded:', invoice.id);

  // Find customer
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: invoice.customer }
  });

  if (!stripeCustomer) {
    console.error('Stripe customer not found:', invoice.customer);
    return;
  }

  // Save payment invoice
  await prisma.paymentInvoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    update: {
      status: invoice.status,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
      invoiceUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf
    },
    create: {
      customerId: stripeCustomer.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid || 0,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
      periodStart: new Date(invoice.period_start * 1000),
      periodEnd: new Date(invoice.period_end * 1000),
      invoiceUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf
    }
  });

  console.log('✅ Payment invoice saved');

  // TODO: Send receipt email
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(invoice) {
  console.log('⚠️  Payment failed:', invoice.id);

  // Find customer
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: invoice.customer },
    include: { user: true }
  });

  if (!stripeCustomer) {
    console.error('Stripe customer not found:', invoice.customer);
    return;
  }

  // Save failed payment invoice
  await prisma.paymentInvoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    update: {
      status: 'open'  // Failed payments remain open
    },
    create: {
      customerId: stripeCustomer.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due || 0,
      currency: invoice.currency.toUpperCase(),
      status: 'open',
      periodStart: new Date(invoice.period_start * 1000),
      periodEnd: new Date(invoice.period_end * 1000),
      invoiceUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf
    }
  });

  console.log('⚠️  Payment failure recorded');

  // TODO: Send payment failed alert email
  // Critical: User needs to update payment method
}

/**
 * Handle checkout session completed event
 */
async function handleCheckoutCompleted(session) {
  console.log('🛒 Checkout completed:', session.id);

  // The subscription.created event will handle the actual subscription creation
  // This is mainly for logging/analytics
  console.log('ℹ️  Subscription will be created by subscription.created event');
}

module.exports = {
  handleWebhook
};
