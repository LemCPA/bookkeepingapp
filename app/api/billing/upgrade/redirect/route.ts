import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentIntentId, returnUrl } = await request.json()

    if (!paymentIntentId || !returnUrl) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    // Retrieve the PaymentIntent to get payment details
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)

    console.log(`[UPGRADE-REDIRECT] Creating Checkout Session for PaymentIntent ${paymentIntentId}`)
    console.log(`[UPGRADE-REDIRECT] Amount: ${pi.amount} ${pi.currency}`)

    // Create a Checkout Session for payment confirmation
    // This provides a Stripe-hosted page where user sees the amount and explicitly approves
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: pi.customer as string,
      line_items: [
        {
          price_data: {
            currency: pi.currency,
            product_data: {
              name: 'Plan Upgrade',
              description: 'Billing upgrade - upgrade charge',
            },
            unit_amount: pi.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Stripe substitutes {CHECKOUT_SESSION_ID} with the actual session ID
      // Return to billing page with session_id so it can verify the payment
      success_url: `${new URL(returnUrl).origin}/billing?success=true&upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(returnUrl).origin}/pricing`,
      metadata: {
        payment_intent_id: paymentIntentId,
      },
    })

    console.log(`[UPGRADE-REDIRECT] ✅ Checkout Session created: ${session.id}`)
    console.log(`[UPGRADE-REDIRECT] Redirect URL: ${session.url}`)

    return NextResponse.json({
      redirectUrl: session.url,
    })
  } catch (error) {
    console.error('[UPGRADE-REDIRECT] Error:', error)
    return NextResponse.json({ error: 'Failed to create payment redirect' }, { status: 500 })
  }
}
