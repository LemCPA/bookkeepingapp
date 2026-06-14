import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase, emailToUuid, saveSubscriptionToSupabase } from '@/lib/supabase-db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10' as any,
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      )
    } catch (error) {
      console.error('[WEBHOOK] Signature verification failed:', error)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log(`[WEBHOOK] Received event: ${event.type}`)

    // Handle subscription creation/updates (primary handler)
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      let planKey = subscription.metadata?.plan

      // Fallback: determine plan from price ID if metadata doesn't have it
      if (!planKey) {
        const priceId = subscription.items.data[0]?.price?.id
        if (priceId) {
          const priceIdMapping: { [key: string]: string } = {
            [process.env.STRIPE_STARTER_PRICE_ID || '']: 'starter',
            [process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || '']: 'starter_annual',
            [process.env.STRIPE_GROWTH_PRICE_ID || '']: 'growth',
            [process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || '']: 'growth_annual',
          }
          planKey = priceIdMapping[priceId]
          console.log(`[WEBHOOK] Determined plan from price ID: ${planKey}`)
        }
      }

      planKey = planKey || 'unknown'

      // Fetch customer to get email for UUID generation
      let customerEmail: string | null = null
      try {
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        customerEmail = (customer as any).email
        if (customerEmail) {
          customerEmail = customerEmail.trim().toLowerCase()
        }
        console.log(`[WEBHOOK] Customer: ${subscription.customer}, Email: ${customerEmail}`)
      } catch (error) {
        console.error('[WEBHOOK] Failed to fetch customer:', error)
        return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
      }

      if (!customerEmail) {
        console.error('[WEBHOOK] No email for customer')
        return NextResponse.json({ error: 'No email for customer' }, { status: 400 })
      }

      // Convert email to UUID (consistent with subscription lookup)
      const userUuid = emailToUuid(customerEmail)
      console.log(`[WEBHOOK] Generated UUID from email: ${userUuid}`)

      // Verify user exists in Supabase before saving subscription
      try {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', userUuid)
          .single()

        if (userError || !user) {
          console.error('[WEBHOOK] User not found in Supabase:', { userUuid, email: customerEmail, error: userError?.message })
          // Don't fail the webhook - user might be created later
          // Just log it for debugging and return success
          return NextResponse.json({ warning: 'User not found, skipping subscription save' }, { status: 202 })
        }
      } catch (userLookupError) {
        console.error('[WEBHOOK] User lookup error:', userLookupError)
        return NextResponse.json({ error: 'User lookup failed' }, { status: 500 })
      }

      // Save to Supabase
      const { error } = await supabase.from('subscriptions').upsert({
        user_id: userUuid,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        plan: planKey,
        status: subscription.status,
        trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        current_period_start: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : null,
        current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
      }, { onConflict: 'stripe_subscription_id' })

      if (error) {
        console.error('[WEBHOOK] Failed to save subscription:', { error, userUuid, planKey, subscriptionId: subscription.id })
        return NextResponse.json({ error: `Failed to save subscription: ${error.message}` }, { status: 500 })
      }

      console.log(`[WEBHOOK] ✅ Subscription saved: ${subscription.id} (${planKey})`)
      return NextResponse.json({ received: true })
    }

    // Handle subscription deletion
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscription.id)

      if (error) {
        console.error('[WEBHOOK] Failed to cancel subscription:', error)
        return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
      }

      console.log(`[WEBHOOK] ✅ Subscription cancelled: ${subscription.id}`)
      return NextResponse.json({ received: true })
    }

    // Handle invoice.payment_succeeded for upgrade tracking
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice
      const upgradePlan = invoice.metadata?.upgrade_plan

      if (upgradePlan) {
        const customerId = invoice.customer as string

        // Fetch customer email to get user UUID
        let customerEmail: string | null = null
        try {
          const customer = await stripe.customers.retrieve(customerId)
          customerEmail = (customer as any).email
          if (customerEmail) {
            customerEmail = customerEmail.trim().toLowerCase()
          }
        } catch (error) {
          console.error('[WEBHOOK] Failed to fetch customer for invoice:', error)
          return NextResponse.json({ received: true })
        }

        if (!customerEmail) {
          console.error('[WEBHOOK] No email for customer on invoice')
          return NextResponse.json({ received: true })
        }

        const userUuid = emailToUuid(customerEmail)
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('id', userUuid)
          .single()

        if (!user) {
          console.error('[WEBHOOK] User not found for invoice')
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

        // CRITICAL FIX: Prevent auto-charging by switching to send_invoice before update
        await stripe.subscriptions.update(subscription.id, {
          collection_method: 'send_invoice',
          days_until_due: 1,
        })

        const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
          items: [
            { id: oldItemId, deleted: true },
            { price: process.env[`STRIPE_${upgradePlan.toUpperCase().replace('-', '_')}_PRICE_ID`] || '' }
          ],
          proration_behavior: 'none',
        })

        // Switch back to charge_automatically
        await stripe.subscriptions.update(subscription.id, {
          collection_method: 'charge_automatically',
        })

        // Safe to update - no recent concurrent changes
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan: upgradePlan,
            status: updatedSubscription.status,
            current_period_start: new Date((updatedSubscription as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((updatedSubscription as any).current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', updatedSubscription.id)

        if (updateError) {
          console.error(`[WEBHOOK] Failed to update subscription: ${updateError.message}`)
          // Fall back to full save
          await saveSubscriptionToSupabase({
            user_id: userUuid,
            stripe_customer_id: customerId,
            stripe_subscription_id: updatedSubscription.id,
            plan: upgradePlan,
            status: updatedSubscription.status,
            trial_end_date: null,
            current_period_start: new Date((updatedSubscription as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((updatedSubscription as any).current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }

        console.log(`[WEBHOOK] ✅ Subscription upgraded for user ${user.id}`)
      }

      return NextResponse.json({ received: true })
    }

    // Acknowledge other event types
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[WEBHOOK] Unexpected error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
