import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { PRICING_PLANS } from '@/lib/stripe-utils'
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

    const { paymentIntentId, paymentMethodId } = await request.json()

    if (!paymentIntentId || !paymentMethodId) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-04-10' as any })

    // Get the PaymentIntent
    let pi = await stripe.paymentIntents.retrieve(paymentIntentId)

    console.log(`[UPGRADE-CONFIRM] PaymentIntent ${paymentIntentId} status: ${pi.status}`)

    // If payment not yet succeeded, confirm it now using the attached payment method
    if (pi.status !== 'succeeded') {
      console.log(`[UPGRADE-CONFIRM] Confirming PaymentIntent with status: ${pi.status}`)
      console.log(`[UPGRADE-CONFIRM] PaymentIntent details:`, {
        paymentIntentId: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        paymentMethod: pi.payment_method,
        customer: pi.customer,
      })

      try {
        // CRITICAL: Must pass payment_method when confirming since it wasn't pre-attached
        // Also provide return_url for payment methods that require redirect (bank transfers, etc.)
        const returnUrl = process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/billing?payment_success=true&upgraded=true`
          : `http://localhost:3000/billing?payment_success=true&upgraded=true`

        pi = await stripe.paymentIntents.confirm(paymentIntentId, {
          payment_method: paymentMethodId,
          return_url: returnUrl,
        })
        console.log(`[UPGRADE-CONFIRM] ✅ PaymentIntent confirmed with payment method ${paymentMethodId}, status: ${pi.status}, return_url: ${returnUrl}`)
      } catch (confirmError) {
        console.error(`[UPGRADE-CONFIRM] ❌ Failed to confirm PaymentIntent:`, confirmError)
        return NextResponse.json({
          error: `Payment confirmation failed. Please try again.`
        }, { status: 400 })
      }
    }

    if (pi.status !== 'succeeded') {
      console.error(`[UPGRADE-CONFIRM] Payment status is ${pi.status}, not succeeded`)
      return NextResponse.json({
        error: `Payment was not approved. Status: ${pi.status}. Please try again.`
      }, { status: 400 })
    }

    console.log(`[UPGRADE-CONFIRM] ✅ Payment succeeded - proceeding with subscription update`)

    // Extract metadata
    const newPlan = pi.metadata?.new_plan
    const subscriptionId = pi.metadata?.subscription_id
    const subscriptionItemId = pi.metadata?.subscription_item_id

    console.log(`[UPGRADE-CONFIRM] PaymentIntent metadata:`, {
      newPlan,
      subscriptionId,
      subscriptionItemId,
      allMetadata: pi.metadata,
    })

    if (!newPlan || !subscriptionId || !subscriptionItemId) {
      console.error(`[UPGRADE-CONFIRM] Missing required metadata`, {
        newPlan,
        subscriptionId,
        subscriptionItemId,
      })
      return NextResponse.json({ error: 'Invalid payment metadata' }, { status: 400 })
    }

    // Update subscription
    const newPlanData = PRICING_PLANS[newPlan as keyof typeof PRICING_PLANS]

    if (!newPlanData || !newPlanData.stripe_price_id) {
      console.error(`[UPGRADE-CONFIRM] Invalid plan data:`, { newPlan, newPlanData, PRICING_PLANS })
      return NextResponse.json({ error: 'Invalid plan configuration' }, { status: 400 })
    }

    console.log(`[UPGRADE-CONFIRM] Updating subscription to new plan`)
    console.log(`[UPGRADE-CONFIRM] Subscription ID: ${subscriptionId}`)
    console.log(`[UPGRADE-CONFIRM] Subscription Item ID: ${subscriptionItemId}`)
    console.log(`[UPGRADE-CONFIRM] New Plan: ${newPlan}`)
    console.log(`[UPGRADE-CONFIRM] New Plan Data:`, newPlanData)
    console.log(`[UPGRADE-CONFIRM] New Price ID: ${newPlanData.stripe_price_id}`)

    // Update the subscription with new items
    let updateSubResult
    try {
      updateSubResult = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscriptionItemId,
            price: newPlanData.stripe_price_id,
          },
        ],
        proration_behavior: 'none',
        metadata: { plan: newPlan, source: 'upgrade' },
      })

      const sub = updateSubResult as any
      console.log(`[UPGRADE-CONFIRM] ✅ Subscription ${subscriptionId} updated to ${newPlan}`)
      console.log(`[UPGRADE-CONFIRM] New subscription status: ${sub.status}`)
      console.log(`[UPGRADE-CONFIRM] Items count: ${sub.items.data.length}`)
      if (sub.items.data[0].price) {
        console.log(`[UPGRADE-CONFIRM] Current item price: ${sub.items.data[0].price.id}`)
        const unitAmount = typeof sub.items.data[0].price.unit_amount === 'number' ? sub.items.data[0].price.unit_amount : 0
        console.log(`[UPGRADE-CONFIRM] Current item price amount: ${unitAmount}`)
        console.log(`[UPGRADE-CONFIRM] Next renewal amount: ${(unitAmount / 100).toFixed(2)}`)
      }
      console.log(`[UPGRADE-CONFIRM] Next renewal: ${new Date((sub as any).current_period_end * 1000).toISOString()}`)

      // CRITICAL: Update Supabase immediately so the upgrade is reflected
      try {
        const userUuid = emailToUuid(userEmail)
        const subscriptionData = {
          user_id: userUuid,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          plan: newPlan,
          status: sub.status,
          trial_end_date: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          canceled_at: null,
        }

        console.log(`[UPGRADE-CONFIRM] About to save subscription to Supabase`)
        console.log(`[UPGRADE-CONFIRM] User email: ${userEmail}`)
        console.log(`[UPGRADE-CONFIRM] User UUID: ${userUuid}`)
        console.log(`[UPGRADE-CONFIRM] Subscription data:`, subscriptionData)

        const saved = await saveSubscriptionToSupabase(subscriptionData)
        console.log(`[UPGRADE-CONFIRM] Save result:`, saved)
        if (saved) {
          console.log(`[UPGRADE-CONFIRM] ✅ Saved upgraded subscription to Supabase for ${userEmail}`)
        } else {
          console.error('[UPGRADE-CONFIRM] ❌ Failed to save upgraded subscription to Supabase')
        }
      } catch (saveErr) {
        console.error('[UPGRADE-CONFIRM] Error saving upgraded subscription to Supabase:', saveErr)
        // Don't fail the request - Stripe was updated successfully, Supabase can be retried
      }
    } catch (updateError) {
      console.error(`[UPGRADE-CONFIRM] ❌ FAILED to update subscription:`, updateError)
      throw updateError
    }

    return NextResponse.json({ success: true, url: '/billing?success=true&upgraded=true' })
  } catch (error) {
    console.error('[UPGRADE-CONFIRM] Error:', error)
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 })
  }
}
