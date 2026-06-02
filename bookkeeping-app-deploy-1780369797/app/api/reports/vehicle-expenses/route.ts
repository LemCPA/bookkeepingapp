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

    // Filter vehicle expenses for the user within date range
    const vehicleTransactions = db.transactions.filter((t) => {
      if (t.user_id !== userId || !t.is_vehicle_expense) return false

      const txnMonth = t.transaction_date.slice(0, 7)
      return txnMonth >= startMonth && txnMonth <= endMonth
    })

    // Calculate totals
    const totalVehicleExpenses = vehicleTransactions.reduce((sum, t) => sum + t.amount, 0)
    const businessUsePercentage = vehicleTransactions.length > 0
      ? vehicleTransactions[0].business_use_percentage || 100
      : 100

    return NextResponse.json({
      totalVehicleExpenses,
      businessUsePercentage,
      deductibleAmount: totalVehicleExpenses * (businessUsePercentage / 100),
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
