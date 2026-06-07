import Stripe from 'stripe'

// Initialize Stripe with server key (lazy initialization)
let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })
  }
  return stripe
}

// Pricing plans
export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: 12,
    interval: 'month',
    uploads_limit: 30,
    stripe_price_id: process.env.STRIPE_STARTER_PRICE_ID || '',
  },
  starter_annual: {
    name: 'Starter (Annual)',
    price: 120,
    interval: 'year',
    uploads_limit: 30,
    stripe_price_id: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || '',
  },
  growth: {
    name: 'Growth',
    price: 24,
    interval: 'month',
    uploads_limit: 200,
    stripe_price_id: process.env.STRIPE_GROWTH_PRICE_ID || '',
  },
  growth_annual: {
    name: 'Growth (Annual)',
    price: 240,
    interval: 'year',
    uploads_limit: 200,
    stripe_price_id: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || '',
  },
}

/**
 * Create a Stripe customer for a new user
 */
export async function createStripeCustomer(email: string, name: string) {
  try {
    const customer = await getStripe().customers.create({
      email,
      name,
      metadata: {
        created_at: new Date().toISOString(),
      },
    })
    return customer.id
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw error
  }
}

/**
 * Create a subscription for a user
 */
export async function createSubscription(
  customerId: string,
  planKey: keyof typeof PRICING_PLANS,
  trialDays: number = 14
) {
  try {
    const plan = PRICING_PLANS[planKey]

    if (!plan.stripe_price_id) {
      throw new Error(`Stripe price ID not configured for plan: ${planKey}`)
    }

    const subscription = await getStripe().subscriptions.create({
      customer: customerId,
      items: [
        {
          price: plan.stripe_price_id,
        },
      ],
      trial_period_days: trialDays,
      metadata: {
        plan: planKey,
      },
    })

    return subscription
  } catch (error) {
    console.error('Error creating subscription:', error)
    throw error
  }
}

/**
 * Get a subscription
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    throw error
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await getStripe().subscriptions.cancel(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

/**
 * Update a subscription (change plan)
 */
export async function updateSubscription(
  subscriptionId: string,
  planKey: keyof typeof PRICING_PLANS
) {
  try {
    const plan = PRICING_PLANS[planKey]

    if (!plan.stripe_price_id) {
      throw new Error(`Stripe price ID not configured for plan: ${planKey}`)
    }

    const subscription = await getStripe().subscriptions.retrieve(subscriptionId)

    const updated = await getStripe().subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: plan.stripe_price_id,
        },
      ],
      metadata: {
        plan: planKey,
      },
    })

    return updated
  } catch (error) {
    console.error('Error updating subscription:', error)
    throw error
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  planKey: keyof typeof PRICING_PLANS,
  successUrl: string,
  cancelUrl: string
) {
  try {
    const plan = PRICING_PLANS[planKey]

    if (!plan.stripe_price_id) {
      throw new Error(`Stripe price ID not configured for plan: ${planKey}`)
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan: planKey,
      },
    })

    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

/**
 * Update subscription with proration
 * When user upgrades/downgrades, Stripe automatically prorates the charges
 */
export async function updateSubscriptionWithProration(
  customerId: string,
  planKey: keyof typeof PRICING_PLANS
) {
  try {
    const plan = PRICING_PLANS[planKey]

    if (!plan.stripe_price_id) {
      throw new Error(`Stripe price ID not configured for plan: ${planKey}`)
    }

    // Get customer's active subscription
    const subscriptions = await getStripe().subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      throw new Error('No active subscription found')
    }

    const subscription = subscriptions.data[0]
    const currentItem = subscription.items.data[0]

    // Update subscription with new price and enable proration
    const updated = await getStripe().subscriptions.update(
      subscription.id,
      {
        items: [
          {
            id: currentItem.id,
            price: plan.stripe_price_id,
          },
        ],
        proration_behavior: 'create_prorations', // Create invoice for prorated amount
        metadata: {
          plan: planKey,
        },
      }
    )

    console.log(`[STRIPE] Updated subscription ${subscription.id} to plan ${planKey} with proration`)
    return updated
  } catch (error) {
    console.error('Error updating subscription with proration:', error)
    throw error
  }
}

/**
 * Get customer portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
) {
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    throw error
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(body: string, signature: string) {
  try {
    const event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
    return event
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw error
  }
}

/**
 * Get invoices for a customer
 */
export async function getCustomerInvoices(customerId: string) {
  try {
    const invoices = await getStripe().invoices.list({
      customer: customerId,
      limit: 10,
    })
    return invoices.data
  } catch (error) {
    console.error('Error retrieving invoices:', error)
    throw error
  }
}

/**
 * Get payment methods for a customer
 */
export async function getCustomerPaymentMethods(customerId: string) {
  try {
    const paymentMethods = await getStripe().paymentMethods.list({
      customer: customerId,
      type: 'card',
    })
    return paymentMethods.data
  } catch (error) {
    console.error('Error retrieving payment methods:', error)
    throw error
  }
}

/**
 * Create a payment link for an invoice (customer-facing payment)
 */
export async function createInvoicePaymentLink(
  invoiceAmount: number,
  invoiceId: number | string,
  invoiceDescription: string,
  successUrl: string,
  cancelUrl: string
) {
  try {
    const paymentLink = await getStripe().paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'cad', // Canadian dollars for this app
            product_data: {
              name: `Invoice #${invoiceId}`,
              description: invoiceDescription,
            },
            unit_amount: Math.round(invoiceAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: successUrl,
        },
      },
      metadata: {
        invoice_id: String(invoiceId),
        type: 'invoice_payment',
      },
    })

    return {
      id: paymentLink.id,
      url: paymentLink.url,
    }
  } catch (error) {
    console.error('Error creating invoice payment link:', error)
    throw error
  }
}

/**
 * Handle subscription events
 */
export function handleSubscriptionEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
      return { type: 'subscription.created', data: event.data.object }
    case 'customer.subscription.updated':
      return { type: 'subscription.updated', data: event.data.object }
    case 'customer.subscription.deleted':
      return { type: 'subscription.canceled', data: event.data.object }
    case 'invoice.paid':
      return { type: 'invoice.paid', data: event.data.object }
    case 'invoice.payment_failed':
      return { type: 'invoice.payment_failed', data: event.data.object }
    case 'charge.succeeded':
      return { type: 'payment.succeeded', data: event.data.object }
    default:
      return null
  }
}
