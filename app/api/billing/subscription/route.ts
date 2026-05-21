import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getSubscription } from '@/lib/db'
import { getPlan, getSubscriptionStatus } from '@/lib/billing-utils'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from JWT token
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current subscription
    const subscription = getSubscription(userId)

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
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        helcimCustomerId: subscription.helcim_customer_id,
        helcimSubscriptionId: subscription.helcim_subscription_id,
        trialEndDate: subscription.trial_end_date,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        createdAt: subscription.created_at,
        canceledAt: subscription.canceled_at,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        priceInCents: plan.priceInCents,
        maxClients: plan.maxClients,
      },
      status: {
        isActive: status.isActive,
        isTrialing: status.isTrialing,
        isPastDue: status.isPastDue,
        isCanceled: status.isCanceled,
        daysUntilEnd: status.daysUntilEnd,
        isExpiringSoon: status.isExpiringSoon,
      },
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
