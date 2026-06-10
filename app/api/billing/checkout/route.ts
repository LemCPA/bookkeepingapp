import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { createCheckoutSession, updateSubscriptionWithProration, PRICING_PLANS } from '@/lib/stripe-utils'
import { updateUserStripeCustomerId, getSubscriptionFromSupabase, emailToUuid, supabase } from '@/lib/supabase-db'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    const userEmail = getUserEmailFromRequest(request)

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user from Supabase using email-based UUID (consistent with signup)
    const userUuid = emailToUuid(userEmail)
    console.log(`[CHECKOUT] Looking up user with UUID: ${userUuid} from email: ${userEmail}`)

    const { data: supabaseUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userUuid)
      .single()

    console.log(`[CHECKOUT] Supabase query result:`, {
      hasData: !!supabaseUser,
      hasError: !!userError,
      errorCode: userError?.code,
      errorMessage: userError?.message,
      userId: supabaseUser?.id,
      userEmail: supabaseUser?.email
    })

    // PGRST116 is "no rows found" - treat as user not found
    if ((userError && userError.code !== 'PGRST116') || !supabaseUser) {
      console.error(`[CHECKOUT] User lookup failed - returning 404`, {
        condition1: userError && userError.code !== 'PGRST116',
        condition2: !supabaseUser,
        errorMessage: userError?.message,
        errorCode: userError?.code
      })
      return NextResponse.json({
        error: 'CHECKOUT_USER_LOOKUP_FAILED',
        debug: {
          errorCode: userError?.code,
          errorMessage: userError?.message,
          userEmail,
          userUuid
        }
      }, { status: 404 })
    }

    const { plan } = await request.json()

    if (!plan || !PRICING_PLANS[plan as keyof typeof PRICING_PLANS]) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Get user data from Supabase
    const userName = supabaseUser.name
    const stripeCustomerId = supabaseUser.stripe_customer_id

    // Auto-create Stripe customer if needed
    if (!stripeCustomerId) {
      try {
        const { createStripeCustomer } = await import('@/lib/stripe-utils')
        const newStripeCustomerId = await createStripeCustomer(userEmail, userName)
        console.log(`[CHECKOUT] Auto-created Stripe customer: ${newStripeCustomerId}`)

        // CRITICAL: Save stripe_customer_id to Supabase (single source of truth)
        // MUST pass userEmail to ensure UUID matches the email-based UUID from signup
        const supabaseSaved = await updateUserStripeCustomerId(userId, newStripeCustomerId, userEmail)
        if (supabaseSaved) {
          console.log(`[CHECKOUT] Saved stripe_customer_id to Supabase for user ${userId}`)
        } else {
          console.warn(`[CHECKOUT] Failed to save stripe_customer_id to Supabase`)
        }
      } catch (error) {
        console.error('[CHECKOUT] Failed to auto-create Stripe customer:', error)
        return NextResponse.json(
          { error: 'Failed to set up payment method' },
          { status: 500 }
        )
      }
    }

    // Check if user already has an active subscription (upgrade scenario)
    const existingSubscription = await getSubscriptionFromSupabase(userEmail)
    const finalStripeCustomerId = stripeCustomerId || supabaseUser.stripe_customer_id

    if (existingSubscription && existingSubscription.status === 'active') {
      // User is upgrading/downgrading - use subscription update with proration
      console.log(`[CHECKOUT] User ${userId} upgrading from ${existingSubscription.plan} to ${plan}`)
      try {
        const updatedSubscription = await updateSubscriptionWithProration(
          finalStripeCustomerId,
          plan as keyof typeof PRICING_PLANS
        )

        console.log(`[CHECKOUT] Subscription updated with proration. New subscription: ${updatedSubscription.id}`)

        // Return redirect to billing page (subscription is already updated in Stripe)
        const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
        return NextResponse.json({
          url: `${baseUrl}/billing?success=true&upgraded=true`
        })
      } catch (error) {
        console.error('[CHECKOUT] Error updating subscription with proration:', error)
        return NextResponse.json(
          { error: 'Failed to upgrade plan. Please try again.' },
          { status: 500 }
        )
      }
    } else {
      // New subscription - use checkout flow
      console.log(`[CHECKOUT] Creating new subscription for user ${userId} on plan ${plan}`)
      const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
      const session = await createCheckoutSession(
        finalStripeCustomerId,
        plan as keyof typeof PRICING_PLANS,
        `${baseUrl}/billing?success=true`,
        `${baseUrl}/pricing`
      )

      return NextResponse.json({ url: session.url })
    }
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
