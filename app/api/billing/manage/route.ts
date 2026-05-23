import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getUser } from '@/lib/db'
import { createBillingPortalSession } from '@/lib/stripe-utils'
export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
export const dynamic = 'force-dynamic'


    const user = getUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
export const dynamic = 'force-dynamic'


    if (!user.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe customer not set up' },
        { status: 400 }
      )
    }
export const dynamic = 'force-dynamic'


    const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
    const session = await createBillingPortalSession(
      user.stripe_customer_id,
      `${baseUrl}/billing`
    )
export const dynamic = 'force-dynamic'


    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}
