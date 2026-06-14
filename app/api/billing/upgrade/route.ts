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

    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    // Get current subscription
    const subscription = await getSubscriptionFromSupabase(userEmail)
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    const stripeSubscription = await stripeInstance.subscriptions.retrieve(subscription.stripe_subscription_id)
    if (!stripeSubscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Get pricing
    const newPrice = PRICING_PLANS[plan as keyof typeof PRICING_PLANS]?.price || 0
    const currentPrice = PRICING_PLANS[subscription.plan as keyof typeof PRICING_PLANS]?.price || 0
    const priceDiff = newPrice - currentPrice

    // Calculate days remaining
    const now = Math.floor(Date.now() / 1000)
    const periodEnd = (stripeSubscription as any).current_period_end
    const daysRemaining = Math.ceil((periodEnd - now) / (24 * 60 * 60))
    const totalDays = 365

    // Calculate prorated charge
    const chargeAmount = Math.round((priceDiff / totalDays) * daysRemaining * 100) // in cents

    if (chargeAmount <= 0) {
      // Downgrade (credit) - just update subscription
      const oldItemId = stripeSubscription.items.data[0].id
      await stripeInstance.subscriptions.update(stripeSubscription.id, {
        items: [
          { id: oldItemId, deleted: true },
          { price: PRICING_PLANS[plan as keyof typeof PRICING_PLANS]?.stripe_price_id }
        ],
        proration_behavior: 'create_prorations'
      })
      
      return NextResponse.json({
        success: true,
        message: 'Subscription downgraded. You have a credit.',
        newPlan: plan
      })
    }

    // Create invoice for prorated upgrade charge
    const invoice = await stripeInstance.invoices.create({
      customer: stripeSubscription.customer as string,
      description: `Upgrade from ${subscription.plan} to ${plan}`,
      collection_method: 'send_invoice',
      days_until_due: 1,
      auto_advance: false,
    })

    // Add line item for upgrade charge
    await stripeInstance.invoiceItems.create({
      invoice: invoice.id,
      customer: stripeSubscription.customer as string,
      amount: chargeAmount,
      description: `Upgrade to ${plan} - prorated for ${daysRemaining} days`,
      metadata: {
        old_plan: subscription.plan,
        new_plan: plan,
        upgrade_type: 'subscription_upgrade'
      }
    })

    // Finalize invoice
    const finalizedInvoice = await stripeInstance.invoices.finalizeInvoice(invoice.id)

    // Store upgrade intent in metadata for webhook to process
    await stripeInstance.subscriptions.update(stripeSubscription.id, {
      metadata: {
        pending_upgrade_plan: plan,
        pending_upgrade_invoice_id: finalizedInvoice.id
      }
    })

    return NextResponse.json({
      invoiceId: finalizedInvoice.id,
      amount: chargeAmount / 100,
      hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
      message: `Pay $${(chargeAmount / 100).toFixed(2)} to upgrade to ${plan}`
    })
  } catch (error) {
    console.error('[UPGRADE]', error)
    return NextResponse.json(
      { error: 'Failed to process upgrade' },
      { status: 500 }
    )
  }
}
