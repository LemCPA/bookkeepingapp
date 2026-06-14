import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const { customerId } = await request.json()

    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (subs.data.length === 0) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
    }

    const subscription = subs.data[0]
    const oldItemId = subscription.items.data[0].id

    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [
        { id: oldItemId, deleted: true },
        { price: 'price_1TgeQTIQrnQfSGBfNyGOD0ub' }
      ],
      proration_behavior: 'none',
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription updated to Growth',
      subscription: updated
    })
  } catch (error) {
    console.error('[FIX-UPGRADE]', error)
    return NextResponse.json(
      { error: 'Failed to fix upgrade' },
      { status: 500 }
    )
  }
}
