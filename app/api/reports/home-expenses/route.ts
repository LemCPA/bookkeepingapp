import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startMonth = searchParams.get('startMonth') || new Date().toISOString().slice(0, 7)
    const endMonth = searchParams.get('endMonth') || new Date().toISOString().slice(0, 7)

    const db = getDb()

    // Get user's GST registration status
    const user = db.users.find(u => u.id === userId)
    const gstRegistered = user?.gst_registered ?? true // Default to registered if not found

    // Get all Business-Use-of-Home accounts for this user (code starting with 9945)
    const homeAccounts = db.chart_of_accounts
      .filter((a) => a.user_id === userId && a.code && a.code.startsWith('9945') && a.code.includes('-'))
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''))

    const homeAccountIds = homeAccounts.map((a) => a.id)

    // Filter home expenses for the user within date range
    const homeTransactions = db.transactions.filter((t) => {
      if (t.user_id !== userId) return false
      if (!t.account_id || !homeAccountIds.includes(t.account_id)) return false

      const txnMonth = t.transaction_date.slice(0, 7)
      return txnMonth >= startMonth && txnMonth <= endMonth
    })

    // Calculate totals and GST by account
    const accountTotals: { [accountId: number]: number } = {}
    const accountGst: { [accountId: number]: number } = {}
    homeAccounts.forEach((account) => {
      accountTotals[account.id] = 0
      accountGst[account.id] = 0
    })

    homeTransactions.forEach((t) => {
      if (t.account_id && accountTotals.hasOwnProperty(t.account_id)) {
        // For non-registered users: use total amount (includes tax)
        // For registered users: use pretax amount (tax is separate)
        const displayAmount = !gstRegistered
          ? (t.amount || 0) + (t.gst_hst_amount || 0)  // Total for non-registered
          : (t.amount || 0)  // Pretax for registered
        accountTotals[t.account_id] += displayAmount
        accountGst[t.account_id] += t.gst_hst_amount || 0
      }
    })

    // Get home business use percentage from query parameter (client localStorage) or fall back to Supabase
    let homeUsePercentage = parseInt(searchParams.get('homePercentage') || '0')
    if (!homeUsePercentage) {
      const percentages = { homePercentage: 100, vehiclePercentage: 100 } // TODO: implement
      homeUsePercentage = percentages?.home_business_use_percentage ?? 100
    }

    // Calculate total home expenses
    const totalHomeExpenses = homeTransactions.reduce((sum, t) => {
      // For non-registered users: use total amount (includes tax)
      // For registered users: use pretax amount (tax is separate)
      const displayAmount = !gstRegistered
        ? (t.amount || 0) + (t.gst_hst_amount || 0)  // Total for non-registered
        : (t.amount || 0)  // Pretax for registered
      return sum + displayAmount
    }, 0)
    const totalGst = homeTransactions.reduce((sum, t) => sum + (t.gst_hst_amount || 0), 0)

    // For non-registered: totalHomeExpenses is already the full amount (includes tax)
    // For registered: need to add tax to get the full amount for display
    const totalWithGst = gstRegistered ? totalHomeExpenses + totalGst : totalHomeExpenses

    // Apply business use percentage to calculate deductible amounts
    // For registered: deductible is based on pretax amount
    // For non-registered: deductible is based on total (which already includes tax)
    const deductibleAmount = totalHomeExpenses * (homeUsePercentage / 100)
    const deductibleGst = totalGst * (homeUsePercentage / 100)

    // Build category breakdown with GST
    const categoryBreakdown = homeAccounts.map((account) => {
      const amount = accountTotals[account.id] || 0
      // For non-registered users: amount already includes tax, so don't add it again
      // For registered users: amount is pretax, so add tax separately
      const gst = gstRegistered ? (accountGst[account.id] || 0) : 0
      const total = amount + gst
      // Apply business use percentage to each category
      const deductibleCategoryTotal = total * (homeUsePercentage / 100)
      return {
        id: account.id,
        name: account.name || '',
        amount,
        gst,
        total,
        deductibleAmount: deductibleCategoryTotal,
      }
    })

    return NextResponse.json({
      totalHomeExpenses,
      totalGst,
      totalWithGst,
      homeUsePercentage,
      deductibleAmount,
      deductibleGst,
      categoryBreakdown,
      transactions: homeTransactions.map((t) => {
        const account = db.chart_of_accounts.find(a => a.id === t.account_id)
        const accountName = account?.name || ''
        return {
          id: t.id,
          transaction_date: t.transaction_date,
          description: t.description,
          amount: t.amount,
          account_name: accountName,
          gst_hst_amount: t.gst_hst_amount || 0,
        }
      }),
    })
  } catch (error: any) {
    console.error('[HOME EXPENSES API]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch home expenses' },
      { status: 500 }
    )
  }
}
