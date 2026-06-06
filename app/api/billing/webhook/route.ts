import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  handleSubscriptionEvent,
} from '@/lib/stripe-utils'
import { getDb, saveDb, clearDbCache } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  console.log('[WEBHOOK] Incoming webhook request')
  console.log('[WEBHOOK] Event type may be determinable from body')

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
    const db = getDb()

    // Handle invoice payment events (charge.succeeded for payment links)
    if (event.type === 'charge.succeeded') {
      const charge = event.data.object as any

      // Check if this is an invoice payment by looking at metadata
      if (charge.metadata?.type === 'invoice_payment' && charge.metadata?.invoice_id) {
        const invoiceId = parseInt(charge.metadata.invoice_id)
        const transaction = db.transactions.find(
          t => t.id === invoiceId && t.type === 'INVOICE'
        )

        if (transaction) {
          // Mark invoice as paid
          transaction.reconciliation_status = 'CLEARED'
          ;(transaction as any).paid_date = new Date().toISOString()
          console.log(`Invoice #${invoiceId} marked as paid via Stripe charge ${charge.id}`)
        }
      }

      saveDb(db)
      return NextResponse.json({ received: true })
    }

    // Handle subscription events
    const handled = handleSubscriptionEvent(event)
    console.log('[WEBHOOK] handleSubscriptionEvent returned:', handled ? handled.type : 'null')

    if (!handled) {
      // Ignore unhandled event types
      console.log('[WEBHOOK] Event type not handled, returning')
      return NextResponse.json({ received: true })
    }

    // Save subscription to database
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      try {
        const subscription = event.data.object as any
        const stripeCustomerId = subscription.customer
        console.log('[WEBHOOK] Processing subscription event for customer:', stripeCustomerId)

        // Find user by stripe_customer_id
        const user = db.users?.find((u: any) => u.stripe_customer_id === stripeCustomerId)
        console.log('[WEBHOOK] User lookup result:', user ? `Found user ${user.id}` : 'User not found')

        if (user) {
          // Initialize subscriptions array if needed
          if (!db.subscriptions) {
            db.subscriptions = []
          }

          // Remove old subscription if exists
          db.subscriptions = db.subscriptions.filter((s: any) => s.user_id !== user.id)

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

          // Add new subscription
          db.subscriptions.push({
            id: (db.subscriptions.length || 0) + 1,
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
          })

          console.log(`[WEBHOOK] Saved subscription for user ${user.id}: ${planKey} (${subscription.status})`)
        } else {
          console.warn(`[WEBHOOK] Could not find user with stripe_customer_id: ${stripeCustomerId}`)
        }
      } catch (error) {
        console.error('[WEBHOOK] Error saving subscription:', error)
      }
    }

    // Log webhook event
    console.log('Webhook event received:', handled.type, handled.data)

    // Save database and clear cache
    saveDb(db)
    clearDbCache()

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
