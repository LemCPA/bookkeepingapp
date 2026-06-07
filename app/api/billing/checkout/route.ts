import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getUser } from '@/lib/db'
import { createCheckoutSession, PRICING_PLANS } from '@/lib/stripe-utils'
import { updateUserStripeCustomerId } from '@/lib/supabase-db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = getUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { plan } = await request.json()

    if (!plan || !PRICING_PLANS[plan as keyof typeof PRICING_PLANS]) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Auto-create Stripe customer if needed
    if (!user.stripe_customer_id) {
      try {
        const { createStripeCustomer } = await import('@/lib/stripe-utils')
        user.stripe_customer_id = await createStripeCustomer(user.email, user.name)
        console.log(`[CHECKOUT] Auto-created Stripe customer: ${user.stripe_customer_id}`)

        // Save the stripe_customer_id to Supabase for webhook lookup
        // This allows the webhook to map stripe_customer_id back to local user_id
        const saved = await updateUserStripeCustomerId(user.id, user.stripe_customer_id)
        if (saved) {
          console.log(`[CHECKOUT] Saved stripe_customer_id to Supabase for user ${user.id}`)
        } else {
          // Log but don't fail - the webhook will still work if we can find the user another way
          console.warn(`[CHECKOUT] Failed to save stripe_customer_id to Supabase for user ${user.id}, continuing anyway`)
        }
      } catch (error) {
        console.error('[CHECKOUT] Failed to auto-create Stripe customer:', error)
        return NextResponse.json(
          { error: 'Failed to set up payment method' },
          { status: 500 }
        )
      }
    }

    const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
    const session = await createCheckoutSession(
      user.stripe_customer_id,
      plan as keyof typeof PRICING_PLANS,
      `${baseUrl}/billing?success=true`,
      `${baseUrl}/pricing`
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
