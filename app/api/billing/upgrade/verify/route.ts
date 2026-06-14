import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { emailToUuid, saveSubscriptionToSupabase } from '@/lib/supabase-db'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    const userEmail = getUserEmailFromRequest(request)

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    // Verify the Checkout Session succeeded
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    console.log(`[UPGRADE-VERIFY] Verifying checkout session ${sessionId}`)
    console.log(`[UPGRADE-VERIFY] Session status: ${session.payment_status}`)

    if (session.payment_status !== 'paid') {
      console.error(`[UPGRADE-VERIFY] Payment not completed. Status: ${session.payment_status}`)
      return NextResponse.json({
        error: 'Payment was not completed',
        status: session.payment_status,
      }, { status: 400 })
    }

    // Payment succeeded! Now update Supabase with the new subscription
    const paymentIntentId = session.payment_intent as string
    const customerId = session.customer as string

    console.log(`[UPGRADE-VERIFY] Payment successful. Getting subscription for customer ${customerId}`)

    // Get the customer's subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (!subscriptions.data.length) {
      console.error(`[UPGRADE-VERIFY] No active subscription found`)
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    const sub = subscriptions.data[0] as any

    console.log(`[UPGRADE-VERIFY] Found subscription ${sub.id}`)
    console.log(`[UPGRADE-VERIFY] Subscription plan: ${sub.metadata?.plan}`)
    console.log(`[UPGRADE-VERIFY] Next renewal: ${new Date((sub as any).current_period_end * 1000).toISOString()}`)

    // CRITICAL: Update Supabase with the subscription data
    const userUuid = emailToUuid(userEmail)
    const subscriptionData = {
      user_id: userUuid,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan: sub.metadata?.plan || 'unknown',
      status: sub.status,
      trial_end_date: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      canceled_at: null,
    }

    const saved = await saveSubscriptionToSupabase(subscriptionData)

    if (saved) {
      console.log(`[UPGRADE-VERIFY] ✅ Subscription updated in Supabase for ${userEmail}`)
      return NextResponse.json({
        success: true,
        message: 'Payment verified and subscription updated',
      })
    } else {
      console.error(`[UPGRADE-VERIFY] ❌ Failed to save subscription to Supabase`)
      return NextResponse.json({
        success: false,
        error: 'Failed to update subscription',
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[UPGRADE-VERIFY] Error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
