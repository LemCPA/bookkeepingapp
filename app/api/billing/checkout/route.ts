import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { createCheckoutSession, PRICING_PLANS } from '@/lib/stripe-utils'
import { updateUserStripeCustomerId, getSubscriptionFromSupabase, emailToUuid, supabase, syncUserToSupabase } from '@/lib/supabase-db'
import { getDb } from '@/lib/db'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    const userEmail = getUserEmailFromRequest(request)

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from local database to get name
    const db = getDb()
    const localUser = db.users.find(u => u.id === userId)
    const userName = localUser?.name || userEmail

    // CRITICAL: Sync user to Supabase FIRST before lookup
    // This ensures user exists with email-based UUID
    const synced = await syncUserToSupabase(userId, userEmail, userName)
    if (!synced) {
      console.error(`[CHECKOUT] ❌ CRITICAL: Failed to sync user ${userId} (${userEmail}) to Supabase`)
      return NextResponse.json(
        { error: 'Failed to initialize account. Please try again.' },
        { status: 500 }
      )
    }
    console.log(`[CHECKOUT] ✅ User synced to Supabase: ${userEmail}`)

    // Fetch user from Supabase using email-based UUID (consistent with signup)
    const userUuid = emailToUuid(userEmail)
    console.log(`[CHECKOUT] Looking up user with UUID: ${userUuid} from email: ${userEmail}`)

    const { data: supabaseUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userUuid)
      .single()

    console.log(`[CHECKOUT] Supabase query result:`, {
      hasData: !!supabaseUser,
      hasError: !!userError,
      errorCode: userError?.code,
      errorMessage: userError?.message,
      userId: supabaseUser?.id,
      userEmail: supabaseUser?.email
    })

    // PGRST116 is "no rows found" - treat as user not found
    if ((userError && userError.code !== 'PGRST116') || !supabaseUser) {
      console.error(`[CHECKOUT] User lookup failed - returning 404`, {
        condition1: userError && userError.code !== 'PGRST116',
        condition2: !supabaseUser,
        errorMessage: userError?.message,
        errorCode: userError?.code
      })
      return NextResponse.json({
        error: 'CHECKOUT_USER_LOOKUP_FAILED',
        debug: {
          errorCode: userError?.code,
          errorMessage: userError?.message,
          userEmail,
          userUuid
        }
      }, { status: 404 })
    }

    const { plan } = await request.json()

    if (!plan || !PRICING_PLANS[plan as keyof typeof PRICING_PLANS]) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Get user data from Supabase
    const stripeCustomerId = supabaseUser.stripe_customer_id

    // Auto-create Stripe customer if needed
    let finalStripeCustomerId = stripeCustomerId
    if (!stripeCustomerId) {
      try {
        const { createStripeCustomer } = await import('@/lib/stripe-utils')
        const newStripeCustomerId = await createStripeCustomer(userEmail, userName)
        console.log(`[CHECKOUT] Auto-created Stripe customer: ${newStripeCustomerId}`)

        // CRITICAL: Save stripe_customer_id to Supabase (single source of truth)
        // MUST pass userEmail to ensure UUID matches the email-based UUID from signup
        const supabaseSaved = await updateUserStripeCustomerId(userId, newStripeCustomerId, userEmail)
        if (supabaseSaved) {
          console.log(`[CHECKOUT] ✅ Saved stripe_customer_id to Supabase for user ${userId}`)
        } else {
          console.error(`[CHECKOUT] ❌ FAILED to save stripe_customer_id to Supabase for user ${userId}`)
          console.error(`[CHECKOUT] Details: userId=${userId}, customerID=${newStripeCustomerId}, email=${userEmail}`)
        }

        // CRITICAL FIX: Use the newly created customer ID, not the stale supabaseUser value
        finalStripeCustomerId = newStripeCustomerId
      } catch (error) {
        console.error('[CHECKOUT] Failed to auto-create Stripe customer:', error)
        return NextResponse.json(
          { error: 'Failed to set up payment method' },
          { status: 500 }
        )
      }
    } else {
      console.log(`[CHECKOUT] Using existing stripe_customer_id: ${stripeCustomerId}`)
    }

    // Check if user already has an active subscription (upgrade scenario)
    // CRITICAL: Check Stripe directly, not Supabase (Supabase might not be updated yet)
    // Stripe is the source of truth for subscriptions
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    const stripeSubscriptions = await stripeInstance.subscriptions.list({
      customer: finalStripeCustomerId,
      status: 'active',
      limit: 1,
    })

    const existingStripeSubscription = stripeSubscriptions.data.length > 0 ? stripeSubscriptions.data[0] : null

    if (existingStripeSubscription) {
      // Get current plan from Stripe
      const subscription = await getSubscriptionFromSupabase(userEmail)

      // Prevent upgrading to same plan
      if (subscription.plan === plan) {
        return NextResponse.json(
          { error: `You're already on the ${plan} plan. Choose a different plan to upgrade or downgrade.` },
          { status: 400 }
        )
      }

      // UPGRADE/DOWNGRADE: Create invoice for prorated charge, send to Stripe for payment
      console.log(`[CHECKOUT] User ${userId} changing from ${subscription.plan} to ${plan}`)

      try {
        // CRITICAL: Check if there's already a pending upgrade invoice (prevent double-charging on rapid clicks)
        const pendingUpgradeInvoiceId = existingStripeSubscription.metadata?.pending_upgrade_invoice_id
        const pendingUpgradePlan = existingStripeSubscription.metadata?.pending_upgrade_plan

        if (pendingUpgradeInvoiceId && pendingUpgradePlan === plan) {
          // Return existing pending invoice instead of creating a duplicate
          const existingInvoice = await stripeInstance.invoices.retrieve(pendingUpgradeInvoiceId)
          console.log(`[CHECKOUT] ⚠️ Pending upgrade already exists for ${plan}, returning existing invoice ${pendingUpgradeInvoiceId}`)

          if (existingInvoice.status === 'paid') {
            // Invoice was paid, upgrade should be finalized by webhook or subscription endpoint
            console.log(`[CHECKOUT] Invoice ${pendingUpgradeInvoiceId} was paid, upgrade should be active`)
          } else if (existingInvoice.status === 'void') {
            // Invoice was voided, create new one
            console.log(`[CHECKOUT] Invoice ${pendingUpgradeInvoiceId} was voided, creating new invoice`)
          } else {
            // Invoice is still open - check if expired
            const hostedInvoiceUrl = existingInvoice.hosted_invoice_url
            const invoiceExpiredDate = new Date(existingInvoice.created * 1000)
            invoiceExpiredDate.setDate(invoiceExpiredDate.getDate() + 3) // Stripe invoices expire after 3 days

            if (new Date() > invoiceExpiredDate) {
              console.log(`[CHECKOUT] Invoice ${pendingUpgradeInvoiceId} expired, user will create new one`)
              return NextResponse.json({
                error: 'invoice_expired',
                message: 'Your payment link expired. Click below to create a new one.',
                action: 'retry',
              }, { status: 410 })
            }

            // Invoice still valid, return it
            return NextResponse.json({
              url: hostedInvoiceUrl,
              message: `Pay $${(existingInvoice.amount_due / 100).toFixed(2)} to upgrade to ${plan}`,
              pending: true,
            })
          }
        }

        // Get pricing
        const newPrice = PRICING_PLANS[plan as keyof typeof PRICING_PLANS]?.price || 0
        const subscription = await getSubscriptionFromSupabase(userEmail)
        const currentPrice = PRICING_PLANS[subscription.plan as keyof typeof PRICING_PLANS]?.price || 0
        const priceDiff = newPrice - currentPrice

        // Calculate days remaining
        const now = Math.floor(Date.now() / 1000)
        const periodEnd = existingStripeSubscription.current_period_end
        const daysRemaining = Math.ceil((periodEnd - now) / (24 * 60 * 60))
        const totalDays = 365

        // Calculate prorated charge
        const chargeAmount = Math.round((priceDiff / totalDays) * daysRemaining * 100) // in cents

        if (chargeAmount <= 0) {
          // Downgrade: Update subscription and apply prorated credit
          const oldItemId = existingStripeSubscription.items.data[0].id
          const creditAmount = Math.abs(chargeAmount) // Convert negative to positive

          // Update subscription with new plan
          const updatedSub = await stripeInstance.subscriptions.update(existingStripeSubscription.id, {
            items: [
              { id: oldItemId, deleted: true },
              { price: PRICING_PLANS[plan as keyof typeof PRICING_PLANS]?.stripe_price_id }
            ],
            proration_behavior: 'create_prorations'
          })

          // If there's a credit, create a credit note
          let creditMessage = ''
          if (creditAmount > 0) {
            try {
              // Get the most recent invoice to create a credit note for
              const invoices = await stripeInstance.invoices.list({
                customer: finalStripeCustomerId,
                limit: 1,
              })

              if (invoices.data.length > 0) {
                const invoice = invoices.data[0]
                await stripeInstance.creditNotes.create({
                  invoice: invoice.id,
                  amount: creditAmount,
                  reason: 'subscription_change',
                  metadata: {
                    downgrade_from: existingStripeSubscription.items.data[0].price?.lookup_key,
                    downgrade_to: plan,
                  }
                })

                const creditFormatted = (creditAmount / 100).toFixed(2)
                const nextBillingDate = new Date(updatedSub.current_period_end * 1000).toLocaleDateString()
                creditMessage = `You've received a $${creditFormatted} credit applied to your next invoice on ${nextBillingDate}.`
                console.log(`[CHECKOUT] Credit note created for $${creditFormatted}`)
              }
            } catch (creditError) {
              console.error('[CHECKOUT] Error creating credit note:', creditError)
              // Continue anyway - subscription was updated successfully
            }
          }

          return NextResponse.json({
            success: true,
            message: creditMessage || `Subscription downgraded to ${plan} successfully. Changes take effect at the end of your billing cycle.`,
            newPlan: plan
          })
        }

        // Create invoice for upgrade charge
        const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
        const invoice = await stripeInstance.invoices.create({
          customer: finalStripeCustomerId,
          description: `Upgrade to ${plan}`,
          collection_method: 'send_invoice',
          days_until_due: 1,
          auto_advance: false,
          metadata: {
            upgrade_plan: plan
          }
        })

        // Add line item
        await stripeInstance.invoiceItems.create({
          invoice: invoice.id,
          customer: finalStripeCustomerId,
          amount: chargeAmount,
          description: `Upgrade to ${plan} - prorated for ${daysRemaining} days`,
          metadata: {
            old_plan: subscription.plan,
            new_plan: plan
          }
        })

        // Finalize invoice
        const finalInvoice = await stripeInstance.invoices.finalizeInvoice(invoice.id)

        // Store pending upgrade in subscription metadata
        await stripeInstance.subscriptions.update(existingStripeSubscription.id, {
          metadata: {
            pending_upgrade_plan: plan,
            pending_upgrade_invoice_id: finalInvoice.id
          }
        })

        console.log(`[CHECKOUT] ✅ Invoice created for upgrade: ${finalInvoice.id}`)

        return NextResponse.json({
          url: finalInvoice.hosted_invoice_url,
          message: `Pay $${(chargeAmount / 100).toFixed(2)} to upgrade to ${plan}`
        })
      } catch (error) {
        console.error('[CHECKOUT] Error processing upgrade:', error)
        return NextResponse.json(
          { error: 'Failed to process upgrade' },
          { status: 500 }
        )
      }
    } else {
      // NEW SUBSCRIPTION: Create new checkout session
      console.log(`[CHECKOUT] Creating new subscription for user ${userId} on plan ${plan}`)

      // Check for pending checkout sessions to prevent double-charging on rapid clicks
      const existingSessions = await stripeInstance.checkout.sessions.list({
        customer: finalStripeCustomerId,
        limit: 10,
      })

      // Find an unpaid session for this plan
      for (const session of existingSessions.data) {
        if (session.status === 'open' && session.metadata?.plan === plan) {
          console.log(`[CHECKOUT] ⚠️ Pending checkout session already exists for ${plan}, returning existing session ${session.id}`)
          return NextResponse.json({ url: session.url })
        }
      }

      // No pending session found, create a new one
      const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
      const session = await createCheckoutSession(
        finalStripeCustomerId,
        plan as keyof typeof PRICING_PLANS,
        `${baseUrl}/billing?success=true`,
        `${baseUrl}/pricing`
      )

      return NextResponse.json({ url: session.url })
    }
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
