import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getUser, getDb } from '@/lib/db'
import { getPlan, calculateTrialEndDate } from '@/lib/billing-utils'

export async function POST(request: NextRequest) {
  try {
    // Get user ID from JWT token
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = getUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { planId } = body

    // Validate plan
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const plan = getPlan(planId)
    if (!plan || planId === 'free') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Check if user already has an active subscription
    const db = getDb()
    const existingSubscription = db.subscriptions.find(
      s => s.user_id === userId && (s.status === 'active' || s.status === 'trialing')
    )
    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      )
    }

    // Create subscription with 14-day trial
    const trialEndDate = calculateTrialEndDate(14)
    const subscriptionId = `sub_${Date.now()}`

    // Add subscription to database
    if (!db.subscriptions) {
      db.subscriptions = []
    }

    db.subscriptions.push({
      id: subscriptionId,
      user_id: userId,
      plan: planId,
      status: 'trialing',
      stripe_customer_id: '', // Will be set when payment is processed
      stripe_subscription_id: subscriptionId,
      trial_end_date: trialEndDate,
      current_period_start: new Date().toISOString(),
      current_period_end: trialEndDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Return subscription data with trial info
    return NextResponse.json({
      subscription: {
        id: subscriptionId,
        plan: planId,
        status: 'trialing',
        trialEndDate,
        message: 'Subscription created successfully with 14-day free trial',
      },
    })
  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
