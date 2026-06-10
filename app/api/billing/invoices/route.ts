import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { getUserFromSupabase, emailToUuid } from '@/lib/supabase-db'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get user ID and email from JWT token
    const userId = getUserIdFromRequest(request)
    const userEmail = getUserEmailFromRequest(request)

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user from Supabase using email-based UUID (consistent with signup)
    const userUuid = emailToUuid(userEmail)
    console.log(`[INVOICES] Looking up user with UUID: ${userUuid} from email: ${userEmail}`)

    const { data: user, error: userError } = await (await import('@/lib/supabase-db')).supabase
      .from('users')
      .select('*')
      .eq('id', userUuid)
      .single()

    console.log(`[INVOICES] Supabase query result:`, {
      hasData: !!user,
      hasError: !!userError,
      errorCode: userError?.code,
      errorMessage: userError?.message,
      userId: user?.id,
      userEmail: user?.email
    })

    // PGRST116 is "no rows found" - treat as user not found
    if ((userError && userError.code !== 'PGRST116') || !user) {
      console.error(`[INVOICES] User lookup failed - returning 404`, {
        condition1: userError && userError.code !== 'PGRST116',
        condition2: !user,
        errorMessage: userError?.message
      })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get Stripe customer ID
    const stripeCustomerId = user.stripe_customer_id
    if (!stripeCustomerId) {
      // User has no Stripe customer yet, return empty invoices
      return NextResponse.json({ invoices: [] })
    }

    // Fetch invoices from Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as any,
    })

    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 50,
    })

    // Format invoices to match expected interface
    const formattedInvoices = invoices.data.map((invoice) => {
      const paidDate = invoice.status === 'paid' ? new Date(invoice.created * 1000).toISOString() : undefined
      return {
        id: invoice.id,
        stripe_invoice_id: invoice.id,
        amount: (invoice.total || 0) / 100, // Convert from cents to dollars
        amount_formatted: `$${((invoice.total || 0) / 100).toFixed(2)}`,
        currency: invoice.currency?.toUpperCase() || 'CAD',
        status: invoice.status || 'draft',
        period_start: new Date(invoice.period_start * 1000).toISOString(),
        period_end: new Date(invoice.period_end * 1000).toISOString(),
        paid_at: paidDate,
        created_at: new Date(invoice.created * 1000).toISOString(),
      }
    })

    console.log(`[INVOICES] Fetched ${formattedInvoices.length} invoices for customer ${stripeCustomerId}`)

    return NextResponse.json({ invoices: formattedInvoices })
  } catch (error) {
    console.error('[INVOICES] Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices', invoices: [] },
      { status: 500 }
    )
  }
}
