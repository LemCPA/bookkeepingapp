import { NextRequest, NextResponse } from 'next/server'
import { getUserEmailFromRequest } from '@/lib/auth-server'
import { getSubscriptionFromSupabase } from '@/lib/supabase-db'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromRequest(request)
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription
    const subscription = await getSubscriptionFromSupabase(userEmail)
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Check if subscription can be canceled (must be at end of billing cycle)
    const now = Math.floor(Date.now() / 1000)
    const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end).getTime() / 1000 : 0

    // Block cancellation if not at end of billing cycle (allow only within last 3 days)
    const daysUntilEnd = Math.ceil((periodEnd - now) / (24 * 60 * 60))
    const CANCELLATION_ALLOWED_DAYS = 3

    if (daysUntilEnd > CANCELLATION_ALLOWED_DAYS) {
      return NextResponse.json(
        {
          error: 'Cannot cancel mid-cycle',
          message: `Subscriptions cannot be canceled before the end of your billing cycle. You can cancel in ${daysUntilEnd - CANCELLATION_ALLOWED_DAYS} days.`,
          daysUntilCancellationAllowed: daysUntilEnd - CANCELLATION_ALLOWED_DAYS
        },
        { status: 400 }
      )
    }

    // Cancel the subscription at end of period (no immediate refund)
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    await stripeInstance.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    console.log(`[CANCEL] Subscription ${subscription.stripe_subscription_id} scheduled for cancellation at period end`)

    return NextResponse.json({
      success: true,
      message: 'Subscription scheduled for cancellation at the end of your billing cycle. No refunds are issued.',
      cancelDate: new Date(periodEnd * 1000).toLocaleDateString()
    })
  } catch (error) {
    console.error('[CANCEL] Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
