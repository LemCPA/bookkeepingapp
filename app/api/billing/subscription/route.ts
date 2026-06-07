import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getSubscriptionFromSupabase } from '@/lib/supabase-db'
import { getPlan, getSubscriptionStatus } from '@/lib/billing-utils'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from JWT token
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current subscription from Supabase
    const subscription = await getSubscriptionFromSupabase(userId)

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
