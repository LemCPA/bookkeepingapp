import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { emailToUuid, supabase } from '@/lib/supabase-db'
import { getPlan, getSubscriptionStatus } from '@/lib/billing-utils'
import Stripe from 'stripe'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    const userEmail = getUserEmailFromRequest(request)
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      const validStatuses = ['active', 'past_due', 'trialing', 'incomplete']
      subscription = subscriptions.find(sub => validStatuses.includes(sub.status)) || null
    }

    // If no subscription in Supabase, check Stripe directly by customer ID
    let stripeCustomerId = subscription?.stripe_customer_id
    if (!subscription) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userUuid)
        .single()

      stripeCustomerId = user?.stripe_customer_id
      if (!stripeCustomerId) {
        return NextResponse.json({
          plan: 'free',
          status: 'free',
          isTrialing: false,
          isActive: false,
        })
      }
    }

    // Fetch latest subscription from Stripe
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    const stripeSubscriptions = await stripeInstance.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    })

    if (stripeSubscriptions.data.length > 0) {
      const stripeSub = stripeSubscriptions.data[0]

      // Check if there's a pending upgrade that was paid but webhook hasn't fired yet (localhost issue)
      const pendingUpgradePlan = stripeSub.metadata?.pending_upgrade_plan
      const pendingUpgradeInvoiceId = stripeSub.metadata?.pending_upgrade_invoice_id

      if (pendingUpgradePlan && pendingUpgradeInvoiceId) {
        // Check if the upgrade invoice was paid
        const invoice = await stripeInstance.invoices.retrieve(pendingUpgradeInvoiceId)
        if (invoice.status === 'paid' || invoice.paid) {
          console.log(`[BILLING] Pending upgrade found and invoice paid, completing upgrade to ${pendingUpgradePlan}`)

          // Complete the upgrade by updating subscription items
          const oldItemId = stripeSub.items.data[0].id
          const { STRIPE_STARTER_PRICE_ID, STRIPE_GROWTH_PRICE_ID, STRIPE_STARTER_ANNUAL_PRICE_ID, STRIPE_GROWTH_ANNUAL_PRICE_ID } = process.env

          const priceMap: { [key: string]: string } = {
            'starter': STRIPE_STARTER_PRICE_ID || '',
            'growth': STRIPE_GROWTH_PRICE_ID || '',
            'starter_annual': STRIPE_STARTER_ANNUAL_PRICE_ID || '',
            'growth_annual': STRIPE_GROWTH_ANNUAL_PRICE_ID || '',
          }

          const newPriceId = priceMap[pendingUpgradePlan]
          if (newPriceId) {
            const updatedSub = await stripeInstance.subscriptions.update(stripeSub.id, {
              items: [
                { id: oldItemId, deleted: true },
                { price: newPriceId }
              ],
              proration_behavior: 'none',
              metadata: {
                pending_upgrade_plan: null,
                pending_upgrade_invoice_id: null,
              }
            })

            console.log(`[BILLING] Upgraded subscription from Stripe to ${pendingUpgradePlan}`)
            // Continue with updated subscription
            subscription = {
              id: updatedSub.id,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: updatedSub.id,
              plan: pendingUpgradePlan,
              status: updatedSub.status,
              current_period_start: new Date(updatedSub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(updatedSub.current_period_end * 1000).toISOString(),
              created_at: new Date().toISOString(),
              trial_end_date: null,
            } as any
          }
        }
      }

      const lookupKey = stripeSub.items.data[0]?.price?.lookup_key

      console.log(`[BILLING] Stripe subscription price lookup_key: ${lookupKey}`)

      if (lookupKey) {
        // Map Stripe lookup_key to our plan names
        const planMapping: { [key: string]: string } = {
          'Starter': 'starter',
          'Growth': 'growth',
          'Annual Starter': 'starter_annual',
          'Growth Annual': 'growth_annual',
        }

        const mappedPlan = planMapping[lookupKey] || lookupKey
        console.log(`[BILLING] Mapped "${lookupKey}" to plan: ${mappedPlan}`)

        // If subscription was not found in Supabase, create it now
        if (!subscription) {
          const { data: newSub, error: insertError } = await supabase
            .from('subscriptions')
            .insert({
              user_id: userUuid,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSub.id,
              plan: mappedPlan,
              status: stripeSub.status,
              current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
              created_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (!insertError && newSub) {
            subscription = newSub
            console.log(`[BILLING] Created missing subscription in Supabase: ${stripeSub.id}`)
          } else {
            console.error('[BILLING] Failed to create subscription:', insertError)
          }
        } else {
          // Subscription exists, sync Stripe data back to Supabase
          try {
            // RACE CONDITION PREVENTION: Only update if plan actually changed
            // This prevents overwriting webhook updates that happen simultaneously
            if (subscription.plan !== mappedPlan) {
              const now = new Date().toISOString()
              const { error: syncError } = await supabase
                .from('subscriptions')
                .update({
                  plan: mappedPlan,
                  status: stripeSub.status,
                  current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                  updated_at: now,
                })
                .eq('id', subscription.id)

              if (syncError) {
                console.error('[BILLING] Failed to sync subscription:', syncError)
              } else {
                console.log(`[BILLING] Synced subscription ${subscription.id} to Supabase with plan: ${mappedPlan}`)
              }
            } else {
              console.log(`[BILLING] Subscription ${subscription.id} already on plan ${mappedPlan}, no sync needed`)
            }
          } catch (syncError) {
            console.error('[BILLING] Failed to sync to Supabase:', syncError)
          }
        }

        // Update subscription object for response
        if (subscription) {
          subscription.plan = mappedPlan
          subscription.status = stripeSub.status
          subscription.current_period_start = new Date(stripeSub.current_period_start * 1000).toISOString()
          subscription.current_period_end = new Date(stripeSub.current_period_end * 1000).toISOString()
        }
      }
    }

    if (!subscription) {
      return NextResponse.json({
        plan: 'free',
        status: 'free',
        isTrialing: false,
        isActive: false,
      })
    }

    const plan = getPlan(subscription.plan)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 500 })
    }

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
    console.error('[BILLING] Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}
