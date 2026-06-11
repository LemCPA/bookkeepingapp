import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { createCheckoutSession, upgradeSubscriptionViaCancel, PRICING_PLANS } from '@/lib/stripe-utils'
import { updateUserStripeCustomerId, getSubscriptionFromSupabase, emailToUuid, supabase, syncUserToSupabase } from '@/lib/supabase-db'
import { getDb } from '@/lib/db'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    const userEmail = getUserEmailFromRequest(request)

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from local database to get name
    const db = getDb()
    const localUser = db.users.find(u => u.id === userId)
    const userName = localUser?.name || userEmail

    // CRITICAL: Sync user to Supabase FIRST before lookup
    // This ensures user exists with email-based UUID
    const synced = await syncUserToSupabase(userId, userEmail, userName)
    if (!synced) {
      console.error(`[CHECKOUT] ❌ CRITICAL: Failed to sync user ${userId} (${userEmail}) to Supabase`)
      return NextResponse.json(
        { error: 'Failed to initialize account. Please try again.' },
        { status: 500 }
      )
    }
    console.log(`[CHECKOUT] ✅ User synced to Supabase: ${userEmail}`)

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
    const stripeCustomerId = supabaseUser.stripe_customer_id

    // Auto-create Stripe customer if needed
    let finalStripeCustomerId = stripeCustomerId
    if (!stripeCustomerId) {
      try {
        const { createStripeCustomer } = await import('@/lib/stripe-utils')
        const newStripeCustomerId = await createStripeCustomer(userEmail, userName)
        console.log(`[CHECKOUT] Auto-created Stripe customer: ${newStripeCustomerId}`)

        // CRITICAL: Save stripe_customer_id to Supabase (single source of truth)
        // MUST pass userEmail to ensure UUID matches the email-based UUID from signup
        const supabaseSaved = await updateUserStripeCustomerId(userId, newStripeCustomerId, userEmail)
        if (supabaseSaved) {
          console.log(`[CHECKOUT] ✅ Saved stripe_customer_id to Supabase for user ${userId}`)
        } else {
          console.error(`[CHECKOUT] ❌ FAILED to save stripe_customer_id to Supabase for user ${userId}`)
          console.error(`[CHECKOUT] Details: userId=${userId}, customerID=${newStripeCustomerId}, email=${userEmail}`)
        }

        // CRITICAL FIX: Use the newly created customer ID, not the stale supabaseUser value
        finalStripeCustomerId = newStripeCustomerId
      } catch (error) {
        console.error('[CHECKOUT] Failed to auto-create Stripe customer:', error)
        return NextResponse.json(
          { error: 'Failed to set up payment method' },
          { status: 500 }
        )
      }
    } else {
      console.log(`[CHECKOUT] Using existing stripe_customer_id: ${stripeCustomerId}`)
    }

    // Check if user already has an active subscription (upgrade scenario)
    // CRITICAL: Check Stripe directly, not Supabase (Supabase might not be updated yet)
    // Stripe is the source of truth for subscriptions
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    const stripeSubscriptions = await stripeInstance.subscriptions.list({
      customer: finalStripeCustomerId,
      status: 'active',
      limit: 1,
    })

    const existingStripeSubscription = stripeSubscriptions.data.length > 0 ? stripeSubscriptions.data[0] : null

    if (existingStripeSubscription) {
      // User is upgrading - cancel old, create new with refund
      console.log(`[CHECKOUT] User ${userId} upgrading from Stripe subscription ${existingStripeSubscription.id} to ${plan}`)
      try {
        const newSubscription = await upgradeSubscriptionViaCancel(
          finalStripeCustomerId,
          plan as keyof typeof PRICING_PLANS
        )

        console.log(`[CHECKOUT] ✅ Upgrade complete. Old subscription canceled, new subscription created: ${newSubscription.id}`)

        // Return redirect to billing page (upgrade is complete)
        const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
        return NextResponse.json({
          url: `${baseUrl}/billing?success=true&upgraded=true`
        })
      } catch (error) {
        console.error('[CHECKOUT] Error upgrading subscription:', error)
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
