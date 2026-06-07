import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  handleSubscriptionEvent,
} from '@/lib/stripe-utils'
import { saveSubscriptionToSupabase, findUserByStripeCustomerId } from '@/lib/supabase-db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  console.log('[WEBHOOK] Incoming webhook request')

  if (!signature) {
    console.error('[WEBHOOK] Missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  try {
    console.log('[WEBHOOK] Verifying signature and parsing event...')
    const event = verifyWebhookSignature(body, signature)
    console.log('[WEBHOOK] Event verified! Type:', event.type)

    // Handle subscription events
    const handled = handleSubscriptionEvent(event)
    console.log('[WEBHOOK] handleSubscriptionEvent returned:', handled ? handled.type : 'null')

    if (!handled) {
      // Ignore unhandled event types
      console.log('[WEBHOOK] Event type not handled, returning')
      return NextResponse.json({ received: true })
    }

    // Save subscription to Supabase
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      try {
        const subscription = event.data.object as any
        const stripeCustomerId = subscription.customer
        console.log('[WEBHOOK] Processing subscription event for customer:', stripeCustomerId)

        // Find user by stripe_customer_id in Supabase
        const user = await findUserByStripeCustomerId(stripeCustomerId)
        console.log('[WEBHOOK] User lookup result:', user ? `Found user ${user.id}` : 'User not found')

        if (user) {
          // Determine plan based on price ID
          let planKey = 'starter' // default
          const priceId = subscription.items?.data?.[0]?.price?.id
          if (priceId) {
            // Map Stripe price IDs to plan names
            if (priceId === process.env.STRIPE_GROWTH_PRICE_ID) {
              planKey = 'growth'
            } else if (priceId === process.env.STRIPE_STARTER_PRICE_ID) {
              planKey = 'starter'
            }
          }

          // Save subscription to Supabase
          const subscriptionData = {
            user_id: user.id,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: subscription.id,
            plan: planKey,
            status: subscription.status,
            trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          }

          const saved = await saveSubscriptionToSupabase(subscriptionData)
          if (saved) {
            console.log(`[WEBHOOK] Successfully saved subscription for user ${user.id}: ${planKey} (${subscription.status})`)
          } else {
            console.error(`[WEBHOOK] Failed to save subscription for user ${user.id}`)
          }
        } else {
          console.warn(`[WEBHOOK] Could not find user with stripe_customer_id: ${stripeCustomerId}`)
        }
      } catch (error) {
        console.error('[WEBHOOK] Error processing subscription:', error)
      }
    }

    console.log('Webhook event processed successfully:', handled.type)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
