import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { getSubscriptionFromSupabase } from '@/lib/supabase-db'
import { PRICING_PLANS } from '@/lib/stripe-utils'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    const userEmail = getUserEmailFromRequest(request)

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await request.json()

    if (!plan || !PRICING_PLANS[plan as keyof typeof PRICING_PLANS]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get current subscription
    const subscription = await getSubscriptionFromSupabase(userEmail)
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    // Get Stripe instance to fetch subscription details
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    const stripeSubscription = await stripeInstance.subscriptions.retrieve(subscription.stripe_subscription_id)

    if (!stripeSubscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Get pricing info (in cents)
    const newPriceCents = Math.round(PRICING_PLANS[plan as keyof typeof PRICING_PLANS]?.price * 100 || 0)
    const currentPriceCents = Math.round(PRICING_PLANS[subscription.plan as keyof typeof PRICING_PLANS]?.price * 100 || 0)

    // Calculate days in billing cycle and days used
    const now = Math.floor(Date.now() / 1000)
    const periodStart = (stripeSubscription as any).current_period_start
    const periodEnd = (stripeSubscription as any).current_period_end
    const totalDaysInCycle = Math.ceil((periodEnd - periodStart) / (24 * 60 * 60))
    const daysUsed = Math.floor((now - periodStart) / (24 * 60 * 60))

    // Correct calculation: newPrice - oldPrice + (oldPrice × daysUsed / daysInCycle)
    const baseDifferenceCents = newPriceCents - currentPriceCents
    const prorataChargeCents = Math.round(currentPriceCents * (daysUsed / totalDaysInCycle))
    const netChargeCents = baseDifferenceCents + prorataChargeCents
    const netCharge = netChargeCents / 100

    return NextResponse.json({
      oldPlan: subscription.plan,
      newPlan: plan,
      oldPlanPrice: currentPriceCents / 100,
      newPlanPrice: newPriceCents / 100,
      daysRemaining: totalDaysInCycle - daysUsed,
      daysUsed,
      totalDaysInCycle,
      netCharge: netCharge,
      baseDifference: baseDifferenceCents / 100,
      prorataCharge: prorataChargeCents / 100,
      billingCycleEnd: new Date(periodEnd * 1000).toISOString(),
      message: `You'll be charged $${netCharge.toFixed(2)} for the upgrade`,
    })
  } catch (error) {
    console.error('[UPGRADE-PREVIEW]', error)
    return NextResponse.json(
      { error: 'Failed to calculate upgrade preview' },
      { status: 500 }
    )
  }
}
