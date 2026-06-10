import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { getSubscriptionFromSupabase } from '@/lib/supabase-db'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // Get user ID and email from JWT token
    const userId = getUserIdFromRequest(request)
    const userEmail = getUserEmailFromRequest(request)
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current subscription from Supabase using email-based UUID
    const subscription = await getSubscriptionFromSupabase(userEmail)

    if (!subscription) {
      return NextResponse.json(
        { error: 'User has no active subscription' },
        { status: 400 }
      )
    }

    if (subscription.status === 'canceled') {
      return NextResponse.json(
        { error: 'Subscription is already canceled' },
        { status: 400 }
      )
    }

    // Cancel subscription in Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    try {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
    } catch (error) {
      console.error('[CANCEL] Error canceling Stripe subscription:', error)
      return NextResponse.json(
        { error: 'Failed to cancel subscription in Stripe' },
        { status: 500 }
      )
    }

    // Note: Webhook will update Supabase when Stripe sends customer.subscription.deleted event
    const now = new Date().toISOString()

    return NextResponse.json({
      message: 'Subscription canceled successfully',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: 'canceled',
        canceledAt: now,
      },
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      {
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
