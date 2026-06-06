import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  handleSubscriptionEvent,
} from '@/lib/stripe-utils'
import { getDb, saveDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  try {
    const event = verifyWebhookSignature(body, signature)
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
    if (!handled) {
      // Ignore unhandled event types
      return NextResponse.json({ received: true })
    }

    // Save subscription to database
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as any
      const stripeCustomerId = subscription.customer

      // Find user by stripe_customer_id
      const user = db.users.find(u => u.stripe_customer_id === stripeCustomerId)
      if (user) {
        // Remove old subscription if exists
        db.subscriptions = db.subscriptions.filter(s => s.user_id !== user.id)

        // Add new subscription
        const planKey = subscription.items.data[0].price.metadata?.plan_key || 'free'
        db.subscriptions.push({
          id: db.nextSubscriptionId || 1,
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscription.id,
          plan: planKey,
          status: subscription.status,
          trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          created_at: new Date().toISOString(),
          canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        })
        db.nextSubscriptionId = (db.nextSubscriptionId || 1) + 1

        console.log(`[WEBHOOK] Saved subscription for user ${user.id}: ${planKey} (${subscription.status})`)
      } else {
        console.warn(`[WEBHOOK] Could not find user with stripe_customer_id: ${stripeCustomerId}`)
      }
    }

    // Log webhook event
    console.log('Webhook event received:', handled.type, handled.data)

    // Save database
    saveDb(db)

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
