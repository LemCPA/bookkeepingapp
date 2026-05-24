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

    // Handle different event types
    const handled = handleSubscriptionEvent(event)
    if (!handled) {
      // Ignore unhandled event types
      return NextResponse.json({ received: true })
    }

    const db = getDb()

    // Log webhook event for now
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
