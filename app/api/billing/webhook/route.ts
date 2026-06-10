import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  verifyWebhookSignature,
  handleSubscriptionEvent,
} from '@/lib/stripe-utils'
import { saveSubscriptionToSupabase, findUserByStripeCustomerId, numericIdToUuid, supabase } from '@/lib/supabase-db'
import { sendPaymentFailedEmail, sendSubscriptionCancelledEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  console.log('[WEBHOOK] Incoming webhook request')

  if (!signature) {
    console.error('[WEBHOOK] Missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  try {
    console.log('[WEBHOOK] Verifying signature and parsing event...')
    const event = verifyWebhookSignature(body, signature)
    console.log('[WEBHOOK] Event verified! Type:', event.type)

    // Handle checkout.session.completed - set metadata on subscription after checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      console.log('[WEBHOOK] Processing checkout.session.completed for session:', session.id)

      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
          apiVersion: '2024-04-10' as any,
        })

        // Get the subscription that was created from this checkout
        const subscriptions = await stripe.subscriptions.list({
          customer: session.customer,
          limit: 1,
        })

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0]
          const planKey = session.metadata?.plan

          // Update the subscription with metadata.plan if checkout session has it
          if (planKey && !subscription.metadata?.plan) {
            console.log(`[WEBHOOK] Setting metadata.plan=${planKey} on subscription ${subscription.id}`)
            await stripe.subscriptions.update(subscription.id, {
              metadata: {
                plan: planKey,
                source: 'checkout',
              },
            })
            console.log(`[WEBHOOK] ✅ Updated subscription metadata`)
          }
        }
      } catch (err) {
        console.warn('[WEBHOOK] Error handling checkout.session.completed:', err)
        // Don't fail the webhook, just log the error
      }

      return NextResponse.json({ received: true })
    }

    // Handle subscription events
    const handled = handleSubscriptionEvent(event)
    console.log('[WEBHOOK] handleSubscriptionEvent returned:', handled ? handled.type : 'null')

    if (!handled) {
      // Ignore unhandled event types
      console.log('[WEBHOOK] Event type not handled, returning')
      return NextResponse.json({ received: true })
    }

    // CRITICAL: Ignore auto-created subscriptions from Stripe
    // ONLY subscriptions with metadata.source = 'checkout' are from explicit user actions
    // Everything else is auto-created by Stripe and must be canceled
    if (event.type === 'customer.subscription.created') {
      const subscription = event.data.object as any

      // Check if this subscription came from an explicit checkout
      const isFromCheckout = subscription.metadata?.source === 'checkout'

      if (!isFromCheckout) {
        console.log('[WEBHOOK] ⚠️ Canceling auto-created subscription:', subscription.id)
        console.log('[WEBHOOK] metadata.source not set to "checkout" - this is not from user action')

        // Delete the auto-created subscription so it doesn't appear in Stripe or get saved to DB
        try {
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2024-04-10' as any,
          })
          await stripe.subscriptions.cancel(subscription.id)
          console.log('[WEBHOOK] ✅ Successfully canceled auto-created subscription:', subscription.id)
        } catch (err) {
          console.warn('[WEBHOOK] Could not cancel auto-created subscription:', err)
        }

        return NextResponse.json({ received: true })
      }
    }

    // Save subscription to Supabase (ONLY for explicit checkouts after above filter)
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'charge.succeeded') {
      try {
        let subscription: any = null
        let stripeCustomerId: string = ''

        // Handle different event types
        if (event.type === 'charge.succeeded') {
          // CRITICAL: Check if this charge is from an auto-created subscription
          // If so, IMMEDIATELY REFUND it to prevent charging users for auto-subscriptions
          const charge = event.data.object as any
          stripeCustomerId = charge.customer
          console.log('[WEBHOOK] Processing charge event for customer:', stripeCustomerId)

          // Fetch the subscription from Stripe using the customer ID
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2024-04-10' as any,
          })

          try {
            const subscriptions = await stripe.subscriptions.list({
              customer: stripeCustomerId,
              limit: 10,
            })
            subscription = subscriptions.data[0]
            console.log('[WEBHOOK] Fetched subscription from Stripe:', subscription?.id)

            // CRITICAL: Check if this subscription is auto-created
            // If it is, REFUND the charge immediately
            if (subscription && !subscription.metadata?.plan && !subscription.metadata?.source) {
              console.log('[WEBHOOK] ⚠️ AUTO-CREATED SUBSCRIPTION DETECTED - REFUNDING CHARGE')
              const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
                apiVersion: '2024-04-10' as any,
              })

              try {
                // Refund the charge
                await stripe.refunds.create({
                  charge: charge.id,
                  reason: 'requested_by_customer'
                })
                console.log('[WEBHOOK] ✅ Refunded charge:', charge.id)

                // Cancel the subscription
                await stripe.subscriptions.cancel(subscription.id)
                console.log('[WEBHOOK] ✅ Canceled auto-created subscription:', subscription.id)
              } catch (refundErr) {
                console.error('[WEBHOOK] Error refunding auto-created subscription:', refundErr)
              }

              return NextResponse.json({ received: true })
            }
          } catch (err) {
            console.error('[WEBHOOK] Error fetching subscription from Stripe:', err)
            return NextResponse.json({ received: true })
          }
        } else {
          // For subscription events, use the subscription directly
          subscription = event.data.object as any
          stripeCustomerId = subscription.customer
          console.log('[WEBHOOK] Processing subscription event for customer:', stripeCustomerId)

          // CRITICAL FIX: ONLY SAVE SUBSCRIPTIONS FROM EXPLICIT CHECKOUTS
          // Only subscriptions with metadata.source = 'checkout' are from user actions
          // Everything else is auto-created by Stripe and must be canceled
          const isFromCheckout = subscription.metadata?.source === 'checkout'

          if (!isFromCheckout) {
            console.log('[WEBHOOK] ⚠️ SUBSCRIPTION NOT FROM CHECKOUT - metadata.source:', subscription.metadata?.source)
            console.log('[WEBHOOK] This is an auto-created subscription, canceling immediately...')
            try {
              const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
                apiVersion: '2024-04-10' as any,
              })
              await stripe.subscriptions.cancel(subscription.id)
              console.log('[WEBHOOK] ✅ Canceled auto-created subscription:', subscription.id)
            } catch (err) {
              console.warn('[WEBHOOK] Could not cancel auto-created subscription:', err)
            }
            return NextResponse.json({ received: true })
          }
        }

        // Find user by stripe_customer_id from Supabase (primary lookup only)
        let user = await findUserByStripeCustomerId(stripeCustomerId)

        if (user) {
          console.log('[WEBHOOK] Found user in Supabase by stripe_customer_id:', user.id)
        } else {
          // CRITICAL: Do NOT fall back to email lookup - it finds the WRONG account!
          // Email fallback causes subscriptions to be saved to old accounts instead of new ones.
          // If stripe_customer_id isn't found, the checkout didn't save it properly.
          console.error('[WEBHOOK] ❌ User not found by stripe_customer_id:', stripeCustomerId)
          console.error('[WEBHOOK] This usually means stripe_customer_id was not saved in Supabase during checkout.')
          console.error('[WEBHOOK] Webhook will abort to prevent saving subscription to wrong account.')
          return NextResponse.json({
            error: 'User not found by stripe_customer_id. Checkout may have failed to save customer ID.'
          }, { status: 400 })
        }

        console.log('[WEBHOOK] User lookup result:', user ? `Found user ${user.id}` : 'User not found')

        if (user) {
          // Get plan from metadata (should ALWAYS be set for explicit checkouts)
          const planKey = subscription.metadata?.plan

          if (!planKey) {
            console.error(`[WEBHOOK] ❌ CRITICAL: No plan found in subscription metadata`)
            console.error(`[WEBHOOK] Only subscriptions from explicit checkouts should reach here`)
            return NextResponse.json({
              error: 'Plan not found in subscription metadata. This subscription was not from a checkout.'
            }, { status: 400 })
          }

          console.log(`[WEBHOOK] Final plan: ${planKey} (from metadata)`)

          // Convert user_id to UUID (only if numeric - user from local DB)
          // If user came from Supabase, user.id is already a UUID
          let userId: string
          if (typeof user.id === 'string' && user.id.includes('-')) {
            // Already a UUID (from Supabase)
            userId = user.id
            console.log('[WEBHOOK] User from Supabase, using UUID directly')
          } else {
            // Numeric ID (from local DB), convert to UUID
            userId = numericIdToUuid(user.id as number)
            console.log(`[WEBHOOK] User from local DB, converted ID ${user.id} to UUID`)
          }

          // Save subscription to Supabase
          // Helper function to safely convert timestamps
          const toISOString = (timestamp: any) => {
            if (!timestamp) return null
            const date = new Date(timestamp * 1000)
            if (isNaN(date.getTime())) {
              console.warn('[WEBHOOK] Invalid timestamp:', timestamp)
              return null
            }
            return date.toISOString()
          }

          const subscriptionData = {
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: subscription.id,
            plan: planKey,
            status: subscription.status,
            trial_end_date: toISOString(subscription.trial_end),
            current_period_start: toISOString(subscription.current_period_start) || new Date().toISOString(),
            current_period_end: toISOString(subscription.current_period_end) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            canceled_at: toISOString(subscription.canceled_at),
          }

          const saved = await saveSubscriptionToSupabase(subscriptionData)
          if (saved) {
            console.log(`[WEBHOOK] Successfully saved subscription for user ${user.id}: ${planKey} (${subscription.status})`)
          } else {
            console.error(`[WEBHOOK] Failed to save subscription for user ${user.id}`)
          }
        } else {
          console.warn(`[WEBHOOK] Could not find user with stripe_customer_id: ${stripeCustomerId}`)
        }
      } catch (error) {
        console.error('[WEBHOOK] Error processing subscription:', error)
      }
    }

    // Handle subscription deletion (cancellation)
    if (event.type === 'customer.subscription.deleted') {
      try {
        const subscription = event.data.object as any
        const stripeCustomerId = subscription.customer
        console.log('[WEBHOOK] Processing subscription deletion for customer:', stripeCustomerId)

        // Find user by stripe_customer_id
        let user = await findUserByStripeCustomerId(stripeCustomerId)

        if (!user) {
          // Fallback: try email lookup
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2024-04-10' as any,
          })
          const customer = await stripe.customers.retrieve(stripeCustomerId)
          if (customer && 'email' in customer && customer.email) {
            const { data: userByEmail } = await supabase
              .from('users')
              .select('*')
              .eq('email', customer.email)
              .single()
            if (userByEmail) {
              user = userByEmail
            }
          }
        }

        if (user) {
          // Update subscription status to canceled
          const userUuid = typeof user.id === 'string' && user.id.includes('-') ? user.id : numericIdToUuid(user.id as number)
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'canceled', canceled_at: new Date().toISOString() })
            .eq('user_id', userUuid)
            .eq('stripe_customer_id', stripeCustomerId)

          if (error) {
            console.error('[WEBHOOK] Error updating subscription status to canceled:', error)
          } else {
            console.log(`[WEBHOOK] Marked subscription as canceled for user ${user.id}`)
          }

          // Send subscription cancelled email notification
          const emailSent = await sendSubscriptionCancelledEmail(user.email, user.name || 'User')
          if (emailSent) {
            console.log(`[WEBHOOK] Subscription cancelled notification email sent to ${user.email}`)
          }
        } else {
          console.warn(`[WEBHOOK] Could not find user for canceled subscription: ${stripeCustomerId}`)
        }
      } catch (error) {
        console.error('[WEBHOOK] Error processing subscription deletion:', error)
      }
    }

    // Handle payment failures
    if (event.type === 'invoice.payment_failed') {
      try {
        const invoice = event.data.object as any
        const stripeCustomerId = invoice.customer
        console.log('[WEBHOOK] Processing payment failure for customer:', stripeCustomerId)

        // Find user by stripe_customer_id
        let user = await findUserByStripeCustomerId(stripeCustomerId)

        if (user) {
          console.log(`[WEBHOOK] Payment failed for user ${user.id} (${stripeCustomerId})`)
          console.log('[WEBHOOK] User has 14-day grace period to resolve payment')

          // Send payment failed email notification
          const emailSent = await sendPaymentFailedEmail(user.email, user.name || 'User')
          if (emailSent) {
            console.log(`[WEBHOOK] Payment failed notification email sent to ${user.email}`)
          }
        } else {
          console.warn(`[WEBHOOK] Could not find user for failed payment: ${stripeCustomerId}`)
        }
      } catch (error) {
        console.error('[WEBHOOK] Error processing payment failure:', error)
      }
    }

    console.log('Webhook event processed successfully:', handled.type)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
