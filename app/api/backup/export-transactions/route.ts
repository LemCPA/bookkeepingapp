import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

function transactionsToCSV(transactions: any[]): string {
  if (transactions.length === 0) {
    return 'ID,Account ID,Account Name,Date,Amount,GST/HST Rate,GST/HST Amount,Description,Type,Reference Number,Created At,Updated At'
  }

  const db = getDb()
  const headers = ['ID', 'Account ID', 'Account Name', 'Date', 'Amount', 'GST/HST Rate', 'GST/HST Amount', 'Description', 'Type', 'Reference Number', 'Created At', 'Updated At']

  const rows = transactions.map(t => {
    const account = db.chart_of_accounts.find(a => a.id === t.account_id)
    return [
      t.id,
      t.account_id,
      account?.name || '',
      t.transaction_date,
      t.amount,
      t.gst_hst_rate || 0,
      t.gst_hst_amount || 0,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.type,
      t.reference_number || '',
      t.created_at,
      t.updated_at || '',
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const { searchParams } = request.nextUrl
    const format = searchParams.get('format') || 'csv'

    // Filter transactions for this user only
    const userTransactions = db.transactions.filter(t => t.user_id === userId)

    const csv = transactionsToCSV(userTransactions)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Transactions export error:', error)
    return NextResponse.json({ error: error.message || 'Failed to export transactions' }, { status: 500 })
  }
}
