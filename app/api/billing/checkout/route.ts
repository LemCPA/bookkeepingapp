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

    const { plan, coupon } = await request.json()

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
        const newStripeCustomerId = await createStripeCustomer(userEmail, userName, userId.toString())
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

    // Coupon will be validated by Stripe at checkout/payment time
    if (coupon) {
      console.log(`[CHECKOUT] ✅ Coupon code provided: ${coupon}`)
    }

    const stripeSubscriptions = await stripeInstance.subscriptions.list({
      customer: finalStripeCustomerId,
      status: 'active',
      limit: 1,
    })

    const existingStripeSubscription = stripeSubscriptions.data.length > 0 ? (stripeSubscriptions.data[0] as Stripe.Subscription) : null

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

      // Prevent switching from annual to monthly before billing cycle ends
      const currentIsAnnual = subscription.plan.includes('annual')
      const newIsAnnual = plan.includes('annual')
      if (currentIsAnnual && !newIsAnnual) {
        return NextResponse.json(
          { error: 'Annual subscriptions cannot be downgraded to monthly before the billing cycle ends. You can switch to monthly at the end of your annual period.' },
          { status: 400 }
        )
      }

      // Tier ordering for upgrade/downgrade checks
      const tierOrder = { starter: 1, growth: 2 }

      // Extract base plan name (remove _annual suffix)
      const currentBasePlan = subscription.plan.replace('_annual', '')
      const newBasePlan = plan.replace('_annual', '')

      const currentTierLevel = tierOrder[currentBasePlan as keyof typeof tierOrder] || 0
      const newTierLevel = tierOrder[newBasePlan as keyof typeof tierOrder] || 0

      // Allow transitions to annual from monthly (any tier)
      const movingToAnnual = !currentIsAnnual && newIsAnnual

      if (!movingToAnnual && newTierLevel < currentTierLevel) {
        // Block downgrades (within same billing period or annual→monthly) until billing cycle ends
        const periodEndDate = new Date(((existingStripeSubscription as any).current_period_end as number) * 1000)
        const formattedDate = periodEndDate.toLocaleDateString()
        return NextResponse.json(
          { error: `Downgrades can only be made after your billing cycle ends on ${formattedDate}. You can upgrade or move to annual anytime.` },
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

        // Calculate the prorated adjustment
        const newPrice = PRICING_PLANS[plan as keyof typeof PRICING_PLANS]?.price || 0
        const subscription = await getSubscriptionFromSupabase(userEmail)
        const currentPrice = PRICING_PLANS[subscription.plan as keyof typeof PRICING_PLANS]?.price || 0
        const priceDiff = newPrice - currentPrice

        // Calculate days remaining
        const now = Math.floor(Date.now() / 1000)
        const stripeSubAny = existingStripeSubscription as any
        const periodStart = stripeSubAny.current_period_start
        const periodEnd = stripeSubAny.current_period_end
        const daysRemaining = Math.ceil((periodEnd - now) / (24 * 60 * 60))
        const totalDays = Math.ceil((periodEnd - periodStart) / (24 * 60 * 60)) // Use actual billing period length (30 for monthly, 365 for annual)

        // Calculate prorated charge (adjustment for the difference)
        const chargeAmount = Math.round((priceDiff / totalDays) * daysRemaining * 100) // in cents

        if (chargeAmount <= 0) {
          // Downgrade: Create invoice for credit instead of auto-charging
          const creditAmount = Math.abs(chargeAmount)

          try {
            // Create credit invoice
            const invoice = await stripeInstance.invoices.create({
              customer: finalStripeCustomerId,
              description: `Downgrade to ${plan} - credit of $${(creditAmount / 100).toFixed(2)}`,
              collection_method: 'send_invoice',
              days_until_due: 1,
              auto_advance: false,
              metadata: {
                downgrade_plan: plan,
                credit_amount: creditAmount
              }
            })

            // Add credit line item (negative amount)
            await stripeInstance.invoiceItems.create({
              invoice: invoice.id,
              customer: finalStripeCustomerId,
              amount: -creditAmount, // Negative = credit
              description: `Credit for downgrade to ${plan}`,
              metadata: {
                old_plan: subscription.plan,
                new_plan: plan
              }
            })

            // Finalize invoice
            const finalInvoice = await stripeInstance.invoices.finalizeInvoice(invoice.id)

            // Store pending downgrade in subscription metadata
            await stripeInstance.subscriptions.update(existingStripeSubscription.id, {
              metadata: {
                pending_upgrade_plan: plan,
                pending_upgrade_invoice_id: finalInvoice.id
              }
            })

            console.log(`[CHECKOUT] ✅ Credit invoice created for downgrade: ${finalInvoice.id}`)

            return NextResponse.json({
              url: finalInvoice.hosted_invoice_url,
              message: `You have a $${(creditAmount / 100).toFixed(2)} credit. View your invoice to confirm the downgrade to ${plan}.`
            })
          } catch (creditError) {
            console.error('[CHECKOUT] Error creating credit invoice:', creditError)
            return NextResponse.json(
              { error: 'Failed to process downgrade' },
              { status: 500 }
            )
          }
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
        `${baseUrl}/pricing`,
        coupon
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
