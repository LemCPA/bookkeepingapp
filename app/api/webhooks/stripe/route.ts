import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { saveSubscriptionToSupabase, findUserByStripeCustomerId, supabase } from '@/lib/supabase-db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10' as any,
})

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  try {
    const body = await request.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )

    console.log(`[WEBHOOK] Received event: ${event.type}`)

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice
      const upgradePlan = invoice.metadata?.upgrade_plan
      
      if (!upgradePlan) {
        return NextResponse.json({ received: true })
      }

      const customerId = invoice.customer as string
      const user = await findUserByStripeCustomerId(customerId)
      
      if (!user) {
        console.error('[WEBHOOK] User not found')
        return NextResponse.json({ received: true })
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      })

      if (subscriptions.data.length === 0) {
        return NextResponse.json({ received: true })
      }

      const subscription = subscriptions.data[0]
      const oldItemId = subscription.items.data[0].id

      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        items: [
          { id: oldItemId, deleted: true },
          { price: process.env[`STRIPE_${upgradePlan.toUpperCase().replace('-', '_')}_PRICE_ID`] || '' }
        ],
        proration_behavior: 'none',
      })

      // RACE CONDITION PREVENTION: Use timestamp-based conflict detection
      // Only update if no other process has modified this subscription recently
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('updated_at')
        .eq('stripe_subscription_id', updatedSubscription.id)
        .single()

      const now = new Date().toISOString()
      const now_timestamp = new Date(now).getTime()

      // If subscription was updated in the last 2 seconds, there's likely a race condition
      const lastUpdateTime = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0
      const timeSinceLastUpdate = now_timestamp - lastUpdateTime

      if (timeSinceLastUpdate < 2000 && existing?.updated_at) {
        console.warn(`[WEBHOOK] Race condition detected (last update ${timeSinceLastUpdate}ms ago), skipping webhook update`)
        // Let the subscription endpoint handle it - it has the latest data
        return NextResponse.json({ received: true })
      }

      // Safe to update - no recent concurrent changes
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan: upgradePlan,
          status: updatedSubscription.status,
          current_period_start: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
          updated_at: now,
        })
        .eq('stripe_subscription_id', updatedSubscription.id)

      if (updateError) {
        console.error(`[WEBHOOK] Failed to update subscription: ${updateError.message}`)
        // Fall back to full save
        await saveSubscriptionToSupabase({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: updatedSubscription.id,
          plan: upgradePlan,
          status: updatedSubscription.status,
          trial_end_date: null,
          current_period_start: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: now,
        })
      }

      console.log(`[WEBHOOK] Subscription upgraded for user ${user.id}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[WEBHOOK] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 })
  }
}
