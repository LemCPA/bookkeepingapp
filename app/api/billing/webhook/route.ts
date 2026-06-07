import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  handleSubscriptionEvent,
} from '@/lib/stripe-utils'
import { saveSubscriptionToSupabase, findUserByStripeCustomerId, numericIdToUuid } from '@/lib/supabase-db'
import { getDb } from '@/lib/db'

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

        // Find user by stripe_customer_id - try Supabase first, then fall back to local DB
        let user = await findUserByStripeCustomerId(stripeCustomerId)

        if (!user) {
          // Fall back to local database lookup
          const db = getDb()
          const localUser = db.users.find((u: any) => u.stripe_customer_id === stripeCustomerId)
          if (localUser) {
            user = localUser
            console.log('[WEBHOOK] Found user in local database:', user.id)
          }
        } else {
          console.log('[WEBHOOK] Found user in Supabase:', user.id)
        }

        console.log('[WEBHOOK] User lookup result:', user ? `Found user ${user.id}` : 'User not found')

        if (user) {
          // Determine plan from metadata first, then fall back to price ID mapping
          let planKey: string = subscription.metadata?.plan || 'starter'
          const priceId = subscription.items?.data?.[0]?.price?.id

          // If not in metadata, map from Stripe price ID directly (hardcoded for reliability)
          if (!subscription.metadata?.plan && priceId) {
            // Known price IDs from Stripe dashboard
            const STARTER_PRICE = 'price_1TfK0iIQrnQfSGBfHDioggge'
            const GROWTH_PRICE = 'price_1TfK1pIQrnQfSGBf3bbvoIce'

            console.log(`[WEBHOOK] Matching priceId: ${priceId}`)
            console.log(`[WEBHOOK]   against STARTER: ${STARTER_PRICE}`)
            console.log(`[WEBHOOK]   against GROWTH: ${GROWTH_PRICE}`)

            if (priceId === GROWTH_PRICE) {
              planKey = 'growth'
              console.log(`[WEBHOOK] ✅ Matched to GROWTH`)
            } else if (priceId === STARTER_PRICE) {
              planKey = 'starter'
              console.log(`[WEBHOOK] ✅ Matched to STARTER`)
            } else {
              console.log(`[WEBHOOK] ⚠️  No match found, defaulting to STARTER`)
              planKey = 'starter'
            }
          }

          console.log(`[WEBHOOK] Final plan: ${planKey} (metadata: ${subscription.metadata?.plan}, priceId: ${priceId})`)

          // Convert user_id to UUID (only if numeric - user from local DB)
          // If user came from Supabase, user.id is already a UUID
          let userId: string
          if (typeof user.id === 'string' && user.id.includes('-')) {
            // Already a UUID (from Supabase)
            userId = user.id
            console.log('[WEBHOOK] User from Supabase, using UUID directly')
          } else {
            // Numeric ID (from local DB), convert to UUID
            userId = numericIdToUuid(user.id as number)
            console.log(`[WEBHOOK] User from local DB, converted ID ${user.id} to UUID`)
          }

          // Save subscription to Supabase
          const subscriptionData = {
            user_id: userId,
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
