import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getUser, getDb, saveDb } from '@/lib/db'
import { createHelcimCustomer, createHelcimSubscription, createPaymentIntent } from '@/lib/helcim-utils'
import { getPlan, calculateTrialEndDate } from '@/lib/billing-utils'
import { createSubscription } from '@/lib/db'

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
    const { planId, paymentMethodToken } = body

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

    // Create Helcim customer if not already created
    let helcimCustomerId = user.helcim_customer_id
    if (!helcimCustomerId) {
      const customerData = await createHelcimCustomer(user.email, user.name, {
        user_id: userId.toString(),
      })
      helcimCustomerId = customerData.id
    }

    // Create subscription with 14-day trial
    const trialEndDate = calculateTrialEndDate(14)
    const subscriptionData = await createHelcimSubscription(
      helcimCustomerId,
      plan.id,
      plan.priceInCents,
      14 // 14-day trial
    )

    // Store subscription in database
    createSubscription(
      userId,
      plan.id,
      helcimCustomerId,
      subscriptionData.id,
      trialEndDate
    )

    // Return subscription data with trial info
    return NextResponse.json({
      subscription: {
        id: subscriptionData.id,
        customerId: helcimCustomerId,
        plan: plan.id,
        status: 'trialing',
        trialEndDate,
        priceInCents: plan.priceInCents,
      },
      message: 'Subscription created successfully with 14-day free trial',
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
