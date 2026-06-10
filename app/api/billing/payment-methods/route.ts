import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { emailToUuid, supabase } from '@/lib/supabase-db'
import Stripe from 'stripe'

export async function GET(request: NextRequest) {
  try {
    // Get user ID and email from JWT token
    const userId = getUserIdFromRequest(request)
    const userEmail = getUserEmailFromRequest(request)

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user from Supabase using email-based UUID
    const userUuid = emailToUuid(userEmail)
    console.log(`[PAYMENT-METHODS] Looking up user with UUID: ${userUuid} from email: ${userEmail}`)

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userUuid)
      .single()

    console.log(`[PAYMENT-METHODS] Supabase query result:`, {
      hasData: !!user,
      hasError: !!userError,
      errorCode: userError?.code,
      errorMessage: userError?.message,
      userId: user?.id,
      userEmail: user?.email
    })

    // PGRST116 is "no rows found" - treat as user not found
    if ((userError && userError.code !== 'PGRST116') || !user) {
      console.error(`[PAYMENT-METHODS] User lookup failed - returning 404`, {
        condition1: userError && userError.code !== 'PGRST116',
        condition2: !user,
        errorMessage: userError?.message
      })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.stripe_customer_id) {
      // No Stripe customer yet, return empty list
      return NextResponse.json({ payment_methods: [] })
    }

    // Fetch payment methods from Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    const paymentMethods = await stripe.customers.listPaymentMethods(user.stripe_customer_id, { limit: 10 })

    return NextResponse.json({
      payment_methods: paymentMethods.data.map(pm => ({
        id: pm.id,
        last4: (pm.card?.last4 || ''),
        brand: pm.card?.brand.toUpperCase() || 'UNKNOWN',
        exp_month: pm.card?.exp_month || 0,
        exp_year: pm.card?.exp_year || 0,
      })),
    })
  } catch (error) {
    console.error('Get payment methods error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get payment methods',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Payment methods are managed through Stripe's hosted interface
  // This endpoint is not implemented - use Stripe's payment method management instead
  return NextResponse.json(
    { error: 'Payment methods must be managed through Stripe' },
    { status: 501 }
  )
}

export async function DELETE(request: NextRequest) {
  // Payment methods are managed through Stripe's hosted interface
  // This endpoint is not implemented - use Stripe's payment method management instead
  return NextResponse.json(
    { error: 'Payment methods must be managed through Stripe' },
    { status: 501 }
  )
}
