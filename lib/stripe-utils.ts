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

// Pricing plans - loaded from environment variables
export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: parseInt(process.env.STRIPE_STARTER_PRICE || '1200') / 100,
    interval: 'month',
    uploads_limit: parseInt(process.env.STRIPE_STARTER_UPLOADS || '30'),
    stripe_price_id: process.env.STRIPE_STARTER_PRICE_ID || '',
  },
  starter_annual: {
    name: 'Starter (Annual)',
    price: parseInt(process.env.STRIPE_STARTER_ANNUAL_PRICE || '13200') / 100,
    interval: 'year',
    uploads_limit: parseInt(process.env.STRIPE_STARTER_UPLOADS || '30'),
    stripe_price_id: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || '',
  },
  growth: {
    name: 'Growth',
    price: parseInt(process.env.STRIPE_GROWTH_PRICE || '2300') / 100,
    interval: 'month',
    uploads_limit: parseInt(process.env.STRIPE_GROWTH_UPLOADS || '500'),
    stripe_price_id: process.env.STRIPE_GROWTH_PRICE_ID || '',
  },
  growth_annual: {
    name: 'Growth (Annual)',
    price: parseInt(process.env.STRIPE_GROWTH_ANNUAL_PRICE || '25200') / 100,
    interval: 'year',
    uploads_limit: parseInt(process.env.STRIPE_GROWTH_UPLOADS || '500'),
    stripe_price_id: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || '',
  },
}

/**
 * Create a Stripe customer for a new user
 */
export async function createStripeCustomer(email: string, name: string, userId: string) {
  try {
    const customer = await getStripe().customers.create({
      email,
      name,
      metadata: {
        user_id: userId,
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
  cancelUrl: string,
  coupon?: string
) {
  try {
    const plan = PRICING_PLANS[planKey]

    if (!plan.stripe_price_id) {
      throw new Error(`Stripe price ID not configured for plan: ${planKey}`)
    }

    const sessionParams: any = {
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
      subscription_data: {
        metadata: {
          plan: planKey,
          source: 'checkout',
        },
      },
    }

    // Add promotion code if provided
    // Map coupon code to promotion code ID
    const promotionCodeMap: { [key: string]: string } = {
      'BETATEST': 'promo_1Thr6rIQrnQfSGBfdwybA6kX',
      'EARLYADOPTER': 'promo_1ThrI5IQrnQfSGBfkosn9cmA',
      'FOUNDING50': 'promo_1ThrKvIQrnQfSGBfmndOiE00',
    }

    if (coupon) {
      const promoId = promotionCodeMap[coupon.toUpperCase()]
      if (promoId) {
        sessionParams.discounts = [{ promotion_code: promoId }]
        console.log(`[CHECKOUT] ✅ Promotion code applied: ${coupon}`)
      }
    }

    const session = await getStripe().checkout.sessions.create(sessionParams)

    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

/**
 * Calculate upgrade amount (net charge for plan upgrade)
 * Does NOT charge - just calculates what user will be charged
 */
export async function calculateUpgradeAmount(
  customerId: string,
  newPlanKey: keyof typeof PRICING_PLANS
) {
  try {
    const stripe = getStripe()
    const newPlan = PRICING_PLANS[newPlanKey]

    if (!newPlan || !newPlan.stripe_price_id) {
      throw new Error(`Stripe configuration error for plan ${newPlanKey}`)
    }

    // Get existing active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      throw new Error('No active subscription found to upgrade')
    }

    const oldSubscription = subscriptions.data[0] as any
    const oldItem = oldSubscription.items.data[0]
    const oldPriceAmountCents = typeof oldItem.price === 'object' ? oldItem.price.unit_amount : 0
    const oldPlanKey = oldSubscription.metadata?.plan || 'unknown'
    const periodStart = oldSubscription.current_period_start
    const periodEnd = oldSubscription.current_period_end

    // Calculate days in period and days used
    const totalDaysInPeriod = (periodEnd - periodStart) / (24 * 60 * 60)
    const now = Math.floor(Date.now() / 1000)
    const daysUsed = Math.floor((now - periodStart) / (24 * 60 * 60))

    // Correct calculation: newPrice - oldPrice + (oldPrice × daysUsed / daysInPeriod)
    const newPriceAmountCents = newPlan.price * 100
    const baseDifference = newPriceAmountCents - oldPriceAmountCents
    const prorataChargeCents = Math.round(oldPriceAmountCents * (daysUsed / totalDaysInPeriod))
    const netChargeCents = baseDifference + prorataChargeCents

    console.log(`[UPGRADE] Calculating ${oldPlanKey} → ${newPlanKey}`)
    console.log(`[UPGRADE] Days used: ${daysUsed}/${Math.ceil(totalDaysInPeriod)}`)
    console.log(`[UPGRADE] Base difference: $${(baseDifference / 100).toFixed(2)}`)
    console.log(`[UPGRADE] Pro-rata charge: $${(prorataChargeCents / 100).toFixed(2)}`)
    console.log(`[UPGRADE] Net charge: $${(netChargeCents / 100).toFixed(2)}`)

    return {
      netChargeCents,
      netChargeAmount: (netChargeCents / 100).toFixed(2),
      subscriptionId: oldSubscription.id,
      customerId,
      oldPlanKey,
      newPlanKey,
      breakdown: {
        oldPriceAmount: (oldPriceAmountCents / 100).toFixed(2),
        newPriceAmount: (newPriceAmountCents / 100).toFixed(2),
        baseDifferenceAmount: (baseDifference / 100).toFixed(2),
        prorataChargeAmount: (prorataChargeCents / 100).toFixed(2),
        daysUsed: Math.floor(daysUsed),
        totalDaysInPeriod: Math.ceil(totalDaysInPeriod),
      },
    }
  } catch (error) {
    console.error('[UPGRADE] Calculation error:', error)
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
            currency: 'cad',
            product_data: {
              name: `Invoice #${invoiceId}`,
              description: invoiceDescription,
            },
            unit_amount: Math.round(invoiceAmount * 100),
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
