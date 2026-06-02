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
