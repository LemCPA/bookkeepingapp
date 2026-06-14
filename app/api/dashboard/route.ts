import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { getUserIdFromRequest, getUserEmailFromRequest } from '@/lib/auth-server'
import { getSubscriptionFromSupabase, emailToUuid, supabase } from '@/lib/supabase-db'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID and email from Authorization header
    const userId = getUserIdFromRequest(request) || 1
    const userEmail = getUserEmailFromRequest(request)

    const db = getDb()
    const user = db.users.find(u => u.id === userId)

    // Get current subscription - check STRIPE FIRST (authoritative), then Supabase
    let currentPlan = 'free'

    // STEP 1: Check Stripe (authoritative source of truth)
    if (userEmail) {
      try {
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
          apiVersion: '2024-04-10' as any,
        })

        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 1,
        })

        if (customers.data.length > 0) {
          const customer = customers.data[0]
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1,
          })

          if (subscriptions.data.length > 0) {
            const stripeSub = subscriptions.data[0]
            const lookupKey = stripeSub.items.data[0]?.price?.lookup_key

            if (lookupKey) {
              // Map lookup_key to display plan name
              const planMap: { [key: string]: string } = {
                'Starter': 'Starter',
                'Starter Monthly': 'Starter',
                'Starter_Monthly': 'Starter',
                'Starter2': 'Starter',
                'Starter_Monthly2': 'Starter',
                'Growth': 'Growth',
                'Growth Monthly': 'Growth',
                'Growth_Monthly': 'Growth',
                'Growth2': 'Growth',
                'Growth_Monthly2': 'Growth',
                'Starter Annual': 'Starter Annual',
                'Starter_Annual': 'Starter Annual',
                'Starter_Annual2': 'Starter Annual',
                'Growth Annual': 'Growth Annual',
                'Growth_Annual': 'Growth Annual',
                'Growth_Annual2': 'Growth Annual',
              }
              currentPlan = planMap[lookupKey] || 'Starter'
            }
          }
        }
      } catch (error) {
        console.warn('[DASHBOARD] Error checking Stripe:', error)
        // Fall through to Supabase check
      }
    }

    // STEP 2: If Stripe didn't find anything, fall back to Supabase
    if (currentPlan === 'free' && userEmail) {
      const subscription = await getSubscriptionFromSupabase(userEmail)
      const validStatuses = ['active', 'past_due', 'trialing', 'incomplete']
      if (subscription && validStatuses.includes(subscription.status)) {
        const planName = subscription.plan
        const formatted = planName
          .split('_')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        currentPlan = formatted
      }
    }
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, year, all

    // Calculate period dates
    const today = new Date()
    let periodStart: Date
    let periodEnd = today

    if (period === 'month') {
      periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
    } else if (period === 'year') {
      periodStart = new Date(today.getFullYear(), 0, 1)
    } else {
      periodStart = new Date('2000-01-01')
    }

    // Get all transactions for this user in the period
    const transactionsForPeriod = db.transactions.filter(t => {
      const tDate = new Date(t.transaction_date)
      const isInPeriod = tDate >= periodStart && tDate <= periodEnd
      return t.user_id === userId && isInPeriod
    })

    // Calculate totals for period
    const totalRevenue = transactionsForPeriod
      .filter(t => t.type === 'INVOICE')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = transactionsForPeriod
      .filter(t => t.type === 'RECEIPT')
      .reduce((sum, t) => sum + t.amount, 0)

    // Get all transactions for this user
    const allUserTransactions = db.transactions.filter(t => t.user_id === userId)

    // Get recent transactions (last 5) for this user
    const recentTransactions = allUserTransactions
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
      .slice(0, 5)
      .map(t => {
        const account = db.chart_of_accounts.find(a => a.id === t.account_id)
        return {
          id: t.id,
          date: t.transaction_date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          accountName: account?.name || 'Unknown',
        }
      })

    // Get recent documents for this user's transactions (last 5)
    const userTransactionIds = allUserTransactions.map(t => t.id)
    const recentDocuments = db.documents
      .filter(doc => userTransactionIds.includes(doc.transaction_id))
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 5)
      .map(doc => {
        const transaction = db.transactions.find(t => t.id === doc.transaction_id)
        return {
          id: doc.id,
          fileName: doc.file_name,
          uploadedAt: doc.uploaded_at,
          transactionId: doc.transaction_id,
          description: transaction?.description || 'Unknown',
        }
      })

    // Get user created_at from Supabase (source of truth for account creation)
    let userCreatedAt = user?.created_at
    if (!userCreatedAt && userEmail) {
      const userUuid = emailToUuid(userEmail)
      const { data: supabaseUser } = await supabase
        .from('users')
        .select('created_at')
        .eq('id', userUuid)
        .single()
      userCreatedAt = supabaseUser?.created_at
    }

    return NextResponse.json({
      period,
      periodStart: formatDate(periodStart.toISOString()),
      periodEnd: formatDate(periodEnd.toISOString()),
      plan: currentPlan,
      userCreatedAt: userCreatedAt || new Date().toISOString(), // Fallback to now if still not found
      metrics: {
        totalTransactions: transactionsForPeriod.length,
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
      },
      recentTransactions,
      recentDocuments,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
