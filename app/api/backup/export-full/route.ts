import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()

    // Filter data for this user only
    const userTransactions = db.transactions.filter(t => t.user_id === userId)
    const userTransactionIds = userTransactions.map(t => t.id)
    const userDocuments = db.documents.filter(d => userTransactionIds.includes(d.transaction_id))
    const userAccounts = db.chart_of_accounts.filter(a => a.user_id === userId)
    const userReconciliations = db.bank_reconciliations.filter(r => r.user_id === userId)
    const userReconciliationIds = userReconciliations.map(r => r.id)
    const userReconciliationItems = db.reconciliation_items.filter(ri => userReconciliationIds.includes(ri.reconciliation_id))

    // Create backup object
    const backup = {
      exportDate: new Date().toISOString(),
      version: '2.0',
      userId: userId,
      data: {
        chart_of_accounts: userAccounts,
        transactions: userTransactions,
        documents: userDocuments,
        bank_reconciliations: userReconciliations,
        reconciliation_items: userReconciliationItems,
      },
    }

    // Return as JSON file download
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="bookkeeping-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error: any) {
    console.error('Backup export error:', error)
    return NextResponse.json({ error: error.message || 'Failed to export backup' }, { status: 500 })
  }
}
