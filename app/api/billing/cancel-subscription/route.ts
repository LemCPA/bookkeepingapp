import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getSubscription, updateSubscription } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get user ID from JWT token
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current subscription
    const subscription = getSubscription(userId)

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

    // Update subscription status in database
    const now = new Date().toISOString()
    updateSubscription(userId, {
      status: 'canceled',
      canceled_at: now,
    })

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
