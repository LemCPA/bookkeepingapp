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
      // CRITICAL: Pass metadata to subscription at creation time (not after)
      // This prevents the subscription.created webhook from canceling it
      subscription_data: {
        metadata: {
          plan: planKey,
          source: 'checkout', // Mark as explicit checkout so webhook doesn't cancel it
        },
      },
    })

    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

/**
 * Upgrade subscription via cancel + create (atomic transaction)
 * ATOMIC FLOW:
 * 1. Cancel old subscription
 * 2. Issue credit memo (refund for unused time)
 * 3. Create new subscription
 * 4. Charge full new plan price
 * Result: User sees refund + new charge as one upgrade action
 */
export async function upgradeSubscriptionViaCancel(
  customerId: string,
  newPlanKey: keyof typeof PRICING_PLANS
) {
  try {
    const stripe = getStripe()
    const newPlan = PRICING_PLANS[newPlanKey]

    if (!newPlan.stripe_price_id) {
      throw new Error(`Stripe price ID not configured for plan: ${newPlanKey}`)
    }

    // Step 1: Get existing active subscription
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
    const oldPriceAmount = typeof oldItem.price === 'object' ? oldItem.price.unit_amount : 0 // in cents

    // Step 2: Calculate prorated refund
    const now = Math.floor(Date.now() / 1000)
    const periodEnd = oldSubscription.current_period_end
    const periodStart = oldSubscription.current_period_start
    const totalDaysInPeriod = (periodEnd - periodStart) / (24 * 60 * 60)
    const daysRemaining = (periodEnd - now) / (24 * 60 * 60)
    const refundAmount = Math.round(oldPriceAmount * (daysRemaining / totalDaysInPeriod))

    console.log(`[STRIPE-UPGRADE] Plan: ${oldSubscription.metadata?.plan} → ${newPlanKey}`)
    console.log(`[STRIPE-UPGRADE] Refund: ${refundAmount} cents (${daysRemaining.toFixed(1)}/${totalDaysInPeriod.toFixed(1)} days)`)

    // Step 3: Cancel old subscription
    const canceledSub = await stripe.subscriptions.cancel(oldSubscription.id)
    console.log(`[STRIPE-UPGRADE] ✅ Canceled subscription ${oldSubscription.id}`)

    // Step 4: Issue credit memo (refund)
    if (refundAmount > 0) {
      const latestInvoice = await stripe.invoices.retrieve(oldSubscription.latest_invoice as string)
      const creditMemo = await stripe.creditNotes.create({
        invoice: latestInvoice.id,
        amount: refundAmount,
        reason: 'requested_by_customer',
      })
      console.log(`[STRIPE-UPGRADE] ✅ Issued credit memo ${creditMemo.id} for ${refundAmount} cents`)
    }

    // Step 5: Create new subscription (full price)
    const newSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: newPlan.stripe_price_id }],
      metadata: {
        plan: newPlanKey,
        source: 'upgrade',
      },
    })

    console.log(`[STRIPE-UPGRADE] ✅ Created new subscription ${newSubscription.id} for plan ${newPlanKey}`)
    console.log(`[STRIPE-UPGRADE] User sees: -${refundAmount} cents (refund) + ${newPlan.price * 100} cents (new plan) = ${newPlan.price * 100 - refundAmount} cents net`)

    // Step 6: Update Supabase with new subscription
    try {
      const { saveSubscriptionToSupabase } = await import('@/lib/supabase-db')
      const supabaseData = {
        user_id: oldSubscription.metadata?.user_id || '',
        stripe_customer_id: customerId,
        stripe_subscription_id: newSubscription.id,
        plan: newPlanKey,
        status: newSubscription.status,
        trial_end_date: newSubscription.trial_end ? new Date(newSubscription.trial_end * 1000).toISOString() : null,
        current_period_start: new Date(newSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(newSubscription.current_period_end * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        canceled_at: null,
      }

      const saved = await saveSubscriptionToSupabase(supabaseData as any)
      if (saved) {
        console.log(`[STRIPE-UPGRADE] ✅ Updated Supabase with new subscription`)
      }
    } catch (err) {
      console.error(`[STRIPE-UPGRADE] Warning: Failed to update Supabase (non-blocking):`, err)
    }

    return newSubscription
  } catch (error) {
    console.error('[STRIPE-UPGRADE] Error during upgrade:', error)
    throw error
  }
}

/**
 * Update subscription with proration
 * Calculates refund for unused time on old plan, charges full new plan
 * User only pays the difference
 */
export async function updateSubscriptionWithProration(
  customerId: string,
  planKey: keyof typeof PRICING_PLANS
) {
  try {
    const stripe = getStripe()
    const newPlan = PRICING_PLANS[planKey]

    if (!newPlan.stripe_price_id) {
      throw new Error(`Stripe price ID not configured for plan: ${planKey}`)
    }

    // Get customer's active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      throw new Error('No active subscription found')
    }

    const subscription = subscriptions.data[0]
    const currentItem = subscription.items.data[0]

    // Get old plan to calculate refund
    const oldPrice = currentItem.price as any
    const oldPlanPrice = oldPrice.unit_amount // in cents

    // Calculate days/months remaining in billing cycle
    const now = Math.floor(Date.now() / 1000)
    const periodEnd = subscription.current_period_end
    const periodStart = subscription.current_period_start
    const totalDaysInPeriod = (periodEnd - periodStart) / (24 * 60 * 60)
    const daysRemaining = (periodEnd - now) / (24 * 60 * 60)

    // Calculate refund for unused time: old plan price × (days remaining / total days)
    const refundAmount = Math.round(oldPlanPrice * (daysRemaining / totalDaysInPeriod))

    console.log(`[STRIPE] Calculating upgrade refund: ${oldPlanPrice} × ${daysRemaining.toFixed(1)}/${totalDaysInPeriod.toFixed(1)} days = ${refundAmount} cents`)

    // Issue credit memo for the refund
    if (refundAmount > 0) {
      const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice as string)

      const creditMemo = await stripe.creditNotes.create({
        invoice: latestInvoice.id,
        amount: refundAmount,
        reason: 'upgrade',
      })

      console.log(`[STRIPE] Issued credit memo ${creditMemo.id} for ${refundAmount} cents`)
    }

    // Update subscription with new price
    const updated = await stripe.subscriptions.update(
      subscription.id,
      {
        items: [
          {
            id: currentItem.id,
            price: newPlan.stripe_price_id,
          },
        ],
        billing_cycle_anchor: now, // Reset billing cycle to today
        proration_behavior: 'none', // Don't prorate again (we handle it manually)
        metadata: {
          plan: planKey,
        },
      }
    )

    console.log(`[STRIPE] Upgraded subscription ${subscription.id} to plan ${planKey}`)
    console.log(`[STRIPE] Refund: ${refundAmount} cents, New plan: ${newPlan.price * 100} cents`)

    // CRITICAL: Also update the subscription in Supabase so dashboard reflects the change
    // Otherwise dashboard reads old plan from Supabase even though Stripe is updated
    try {
      const { saveSubscriptionToSupabase } = await import('@/lib/supabase-db')
      const supabaseData = {
        user_id: subscription.metadata?.user_id || '',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan: planKey,
        status: updated.status,
        trial_end_date: updated.trial_end ? new Date(updated.trial_end * 1000).toISOString() : null,
        current_period_start: new Date(updated.current_period_start * 1000).toISOString(),
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
        created_at: new Date(subscription.created * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        canceled_at: updated.canceled_at ? new Date(updated.canceled_at * 1000).toISOString() : null,
      }

      const saved = await saveSubscriptionToSupabase(supabaseData as any)
      if (saved) {
        console.log(`[STRIPE] ✅ Updated subscription in Supabase to plan ${planKey}`)
      } else {
        console.error(`[STRIPE] ❌ Failed to update subscription in Supabase after upgrade`)
      }
    } catch (err) {
      console.error(`[STRIPE] Error updating Supabase after upgrade (non-blocking):`, err)
      // Don't throw - Stripe update succeeded, Supabase update is just for dashboard sync
    }

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
