import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { emailToUuid, supabase } from '@/lib/supabase-db'
import { getPlan, getSubscriptionStatus } from '@/lib/billing-utils'

export async function GET(request: NextRequest) {
  try {
    // Get user ID and email from JWT token
    const userId = getUserIdFromRequest(request)
    const userEmail = getUserEmailFromRequest(request)
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current subscription from Supabase using email-based UUID
    // (subscriptions are saved with email-based UUID during checkout)
    const userUuid = emailToUuid(userEmail)
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userUuid)
      .order('created_at', { ascending: false })

    if (subError && subError.code !== 'PGRST116') {
      console.error('[BILLING] Error fetching subscription:', subError)
      return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 })
    }

    let subscription = null
    if (subscriptions && subscriptions.length > 0) {
      // Find the most recent active subscription
      const validStatuses = ['active', 'past_due', 'trialing', 'incomplete']
      subscription = subscriptions.find(sub => validStatuses.includes(sub.status)) || null
    }

    if (!subscription) {
      // Return free plan as default
      return NextResponse.json({
        plan: 'free',
        status: 'free',
        isTrialing: false,
        isActive: false,
        message: 'User is on free plan',
      })
    }

    // Get plan details
    const plan = getPlan(subscription.plan)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 500 })
    }

    // Get subscription status
    const status = getSubscriptionStatus(
      subscription.status,
      subscription.trial_end_date,
      subscription.current_period_end
    )

    return NextResponse.json({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      trial_end_date: subscription.trial_end_date,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      created_at: subscription.created_at,
      canceled_at: subscription.canceled_at,
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
