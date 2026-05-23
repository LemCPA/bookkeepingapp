import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  parseWebhookEvent,
  handleWebhookEvent,
} from '@/lib/helcim-utils'
import { getDb, saveDb, getWebhookEvent, createWebhookEvent, markWebhookProcessed, updateSubscription, createBillingEntry } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const payload = await request.text()
    const signature = request.headers.get('X-Helcim-Signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    try {
      if (!verifyWebhookSignature(payload, signature)) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
    } catch (signError) {
      console.error('Webhook signature verification error:', signError)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 401 }
      )
    }

    // Parse webhook event
    const data = JSON.parse(payload)
    const event = parseWebhookEvent(data)

    // Check if event has already been processed
    const existingEvent = getWebhookEvent(event.id)
    if (existingEvent) {
      console.log(`Webhook event ${event.id} already processed`)
      return NextResponse.json({ status: 'already_processed' })
    }

    // Create webhook event record
    const webhookRecord = createWebhookEvent(event.id, event.type)

    // Handle specific webhook events
    switch (event.type) {
      case 'payment.success':
        await handlePaymentSuccess(event.data)
        break
      case 'payment.failed':
        await handlePaymentFailed(event.data)
        break
      case 'subscription.created':
        await handleSubscriptionCreated(event.data)
        break
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data)
        break
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data)
        break
      case 'invoice.created':
        await handleInvoiceCreated(event.data)
        break
      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    // Mark webhook as processed
    markWebhookProcessed(webhookRecord.lastID)

    return NextResponse.json({ status: 'processed', eventId: event.id })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Handle payment.success webhook
 */
async function handlePaymentSuccess(data: any) {
  console.log('Payment successful for subscription:', data.subscription_id)

  const db = getDb()
  const subscription = db.subscriptions.find(
    s => s.helcim_subscription_id === data.subscription_id
  )

  if (subscription) {
    // Update subscription status to active if it was trialing
    if (subscription.status === 'trialing') {
      updateSubscription(subscription.user_id, { status: 'active', trial_end_date: null })
    }
  }
}

/**
 * Handle payment.failed webhook
 */
async function handlePaymentFailed(data: any) {
  console.log('Payment failed for subscription:', data.subscription_id)

  const db = getDb()
  const subscription = db.subscriptions.find(
    s => s.helcim_subscription_id === data.subscription_id
  )

  if (subscription) {
    // Update subscription status to past_due
    updateSubscription(subscription.user_id, { status: 'past_due' })

    // TODO: Send email notification to user about failed payment
  }
}

/**
 * Handle subscription.created webhook
 */
async function handleSubscriptionCreated(data: any) {
  console.log('Subscription created in Helcim:', data.subscription_id)
  // Additional processing can be added here if needed
}

/**
 * Handle subscription.updated webhook
 */
async function handleSubscriptionUpdated(data: any) {
  console.log('Subscription updated in Helcim:', data.subscription_id)

  const db = getDb()
  const subscription = db.subscriptions.find(
    s => s.helcim_subscription_id === data.subscription_id
  )

  if (subscription && data.status) {
    // Update subscription status if status changed in Helcim
    updateSubscription(subscription.user_id, { status: data.status })
  }
}

/**
 * Handle subscription.canceled webhook
 */
async function handleSubscriptionCanceled(data: any) {
  console.log('Subscription canceled in Helcim:', data.subscription_id)

  const db = getDb()
  const subscription = db.subscriptions.find(
    s => s.helcim_subscription_id === data.subscription_id
  )

  if (subscription) {
    // Update subscription status to canceled
    updateSubscription(subscription.user_id, {
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })

    // TODO: Send email notification to user about cancellation
  }
}

/**
 * Handle invoice.created webhook
 */
async function handleInvoiceCreated(data: any) {
  console.log('Invoice created in Helcim:', data.invoice_id)

  const db = getDb()
  const subscription = db.subscriptions.find(
    s => s.helcim_subscription_id === data.subscription_id
  )

  if (subscription && data.amount) {
    // Create billing history entry
    createBillingEntry(
      subscription.user_id,
      data.invoice_id,
      data.amount,
      data.currency || 'CAD',
      'pending',
      data.period_start || new Date().toISOString().split('T')[0],
      data.period_end || new Date().toISOString().split('T')[0]
    )

    // TODO: Send email notification to user about new invoice
  }
}
