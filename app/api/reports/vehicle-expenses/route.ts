import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getDb, saveDb } from '@/lib/db'

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

    // Filter vehicle expenses for the user within date range
    const vehicleTransactions = db.transactions.filter((t) => {
      if (t.user_id !== userId || !t.is_vehicle_expense) return false

      const txnMonth = t.transaction_date.slice(0, 7)
      return txnMonth >= startMonth && txnMonth <= endMonth
    })

    // Get all vehicle expense accounts (9281-*)
    const vehicleAccounts = db.chart_of_accounts
      .filter((a) => a.user_id === userId && a.code && a.code.startsWith('9281') && a.code.includes('-'))
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''))

    // Calculate totals and GST by account
    const accountTotals: { [accountId: number]: number } = {}
    const accountGst: { [accountId: number]: number } = {}
    vehicleAccounts.forEach((account) => {
      accountTotals[account.id] = 0
      accountGst[account.id] = 0
    })

    vehicleTransactions.forEach((t) => {
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

    // Get vehicle business use percentage from query parameter (client localStorage) or fall back to Supabase
    let defaultVehicleUsePercentage = parseInt(searchParams.get('vehiclePercentage') || '0')
    if (!defaultVehicleUsePercentage) {
      const percentages = await getBusinessUsePercentagesFromSupabase(userId)
      defaultVehicleUsePercentage = percentages?.vehicle_business_use_percentage ?? 100
    }

    // Calculate totals
    const totalVehicleExpenses = vehicleTransactions.reduce((sum, t) => {
      // For non-registered users: use total amount (includes tax)
      // For registered users: use pretax amount (tax is separate)
      const displayAmount = !gstRegistered
        ? (t.amount || 0) + (t.gst_hst_amount || 0)  // Total for non-registered
        : (t.amount || 0)  // Pretax for registered
      return sum + displayAmount
    }, 0)
    const totalGst = vehicleTransactions.reduce((sum, t) => sum + (t.gst_hst_amount || 0), 0)

    // Calculate deductible amount using per-transaction percentages (if available)
    // Falls back to default percentage for transactions without one
    let totalDeductibleAmount = 0
    let totalDeductibleGst = 0

    vehicleTransactions.forEach((t) => {
      // Use transaction-level percentage if available, otherwise use default
      const txPercentage = (t.business_use_percentage ?? defaultVehicleUsePercentage) / 100
      // For non-registered users: use total amount (includes tax)
      // For registered users: use pretax amount (tax is separate)
      const baseAmount = !gstRegistered
        ? (t.amount || 0) + (t.gst_hst_amount || 0)  // Total for non-registered
        : (t.amount || 0)  // Pretax for registered
      totalDeductibleAmount += baseAmount * txPercentage
      totalDeductibleGst += (t.gst_hst_amount || 0) * txPercentage
    })

    // Build category breakdown with GST
    const categoryBreakdown = vehicleAccounts.map((account) => {
      const amount = accountTotals[account.id] || 0
      // For non-registered users: amount already includes tax, so don't add it again
      // For registered users: amount is pretax, so add tax separately
      const gst = gstRegistered ? (accountGst[account.id] || 0) : 0
      const total = amount + gst
      // Apply default percentage to each category
      const deductibleCategoryTotal = total * (defaultVehicleUsePercentage / 100)
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
      totalVehicleExpenses,
      totalGst,
      businessUsePercentage: defaultVehicleUsePercentage,
      deductibleAmount: totalDeductibleAmount,
      deductibleGst: totalDeductibleGst,
      categoryBreakdown,
      transactions: vehicleTransactions.map((t) => {
        const account = db.chart_of_accounts.find(a => a.id === t.account_id)
        const accountName = account?.name || ''
        // Strip "Motor Vehicle Expenses - " prefix from account name
        const cleanAccountName = accountName.startsWith('Motor Vehicle Expenses - ')
          ? accountName.replace('Motor Vehicle Expenses - ', '')
          : accountName
        return {
          id: t.id,
          transaction_date: t.transaction_date,
          description: t.description,
          amount: t.amount,
          business_use_percentage: t.business_use_percentage,
          account_name: cleanAccountName,
          gst_hst_amount: t.gst_hst_amount || 0,
        }
      }),
    })
  } catch (error: any) {
    console.error('[VEHICLE EXPENSES API]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vehicle expenses' },
      { status: 500 }
    )
  }
}
