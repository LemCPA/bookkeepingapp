import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getUser } from '@/lib/db'
import { createCheckoutSession, PRICING_PLANS } from '@/lib/stripe-utils'

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

    if (!user.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe customer not set up' },
        { status: 400 }
      )
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
