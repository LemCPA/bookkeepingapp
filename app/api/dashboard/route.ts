import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header, default to 1 for single-user setup
    const userId = getUserIdFromRequest(request) || 1

    const db = getDb()
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

    // Get all transactions for this user (not just for period) for A/R and A/P aging
    const allUserTransactions = db.transactions.filter(t => t.user_id === userId)
    const allInvoices = allUserTransactions.filter(t => t.type === 'INVOICE')
    const allBills = allUserTransactions.filter(t => t.type === 'RECEIPT')

    // Calculate overdue A/R (unpaid invoices past due)
    const asOfDateStr = '2026-05-18'
    const asOfDate = new Date(asOfDateStr)

    const overdueAR = allInvoices
      .filter(t => t.reconciliation_status !== 'CLEARED') // unpaid
      .filter(t => {
        const dueDate = t.due_date ? new Date(t.due_date) : new Date(new Date(t.transaction_date).getTime() + 30 * 24 * 60 * 60 * 1000)
        return dueDate < asOfDate // overdue
      })
      .reduce((sum, t) => sum + t.amount + (t.gst_hst_amount || 0), 0)

    // Calculate overdue A/P (unpaid bills past due)
    const overdueAP = allBills
      .filter(t => t.reconciliation_status !== 'CLEARED') // unpaid
      .filter(t => {
        const dueDate = t.due_date ? new Date(t.due_date) : new Date(new Date(t.transaction_date).getTime() + 30 * 24 * 60 * 60 * 1000)
        return dueDate < asOfDate // overdue
      })
      .reduce((sum, t) => sum + t.amount + (t.gst_hst_amount || 0), 0)

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

    // Get reconciliation status for this user
    const userTransactions = db.transactions.filter(t => t.user_id === userId)
    const totalTransactions = userTransactions.length
    const reconciled = userTransactions.filter(t => t.reconciliation_status === 'CLEARED').length
    const unreconciled = totalTransactions - reconciled
    const lastReconciliation = db.bank_reconciliations
      .filter(r => r.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .at(0)?.updated_at || null

    return NextResponse.json({
      period,
      periodStart: formatDate(periodStart.toISOString()),
      periodEnd: formatDate(periodEnd.toISOString()),
      metrics: {
        totalTransactions: transactionsForPeriod.length,
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        overdueAR,
        overdueAP,
      },
      reconciliation: {
        totalTransactions,
        reconciled,
        unreconciled,
        percentReconciled: totalTransactions > 0 ? Math.round((reconciled / totalTransactions) * 100) : 0,
        lastReconciliation,
      },
      recentTransactions,
      recentDocuments,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
