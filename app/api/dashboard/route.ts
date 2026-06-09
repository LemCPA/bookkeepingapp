import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header, default to 1 for single-user setup
    const userId = getUserIdFromRequest(request) || 1

    const db = getDb()
    const user = db.users.find(u => u.id === userId)
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, year, all

    // Calculate period dates
    const today = new Date('2026-05-18')
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

    return NextResponse.json({
      period,
      periodStart: formatDate(periodStart.toISOString()),
      periodEnd: formatDate(periodEnd.toISOString()),
      plan: user?.plan || 'free',
      userCreatedAt: user?.created_at || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
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
