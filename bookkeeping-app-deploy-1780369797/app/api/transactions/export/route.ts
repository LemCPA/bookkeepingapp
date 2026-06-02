import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get filter parameters from query string
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const types = searchParams.getAll('type')
    const clientIds = searchParams.getAll('clientIds')

    const db = getDb()

    // Get user's transactions
    let transactions = db.transactions.filter(t => t.user_id === userId)

    // Apply filters
    if (dateFrom) {
      transactions = transactions.filter(t => t.transaction_date >= dateFrom)
    }
    if (dateTo) {
      transactions = transactions.filter(t => t.transaction_date <= dateTo)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        t.type.toLowerCase().includes(searchLower)
      )
    }
    if (types.length > 0) {
      transactions = transactions.filter(t => types.includes(t.type))
    }
    if (clientIds.length > 0) {
      transactions = transactions.filter(t =>
        t.client_id && clientIds.includes(t.client_id.toString())
      )
    }

    // Get client and account names
    const getClientName = (clientId?: number) => {
      if (!clientId) return ''
      const client = db.clients.find(c => c.id === clientId)
      return client?.name || ''
    }

    const getAccountName = (accountId?: number) => {
      if (!accountId) return ''
      const account = db.chart_of_accounts.find(a => a.id === accountId)
      return account?.name || ''
    }

    // Build CSV header
    const headers = [
      'Date',
      'Client',
      'Account',
      'Description',
      'Type',
      'Amount',
      'GST/HST Rate',
      'GST/HST Amount',
      'Reference',
    ]

    // Build CSV rows
    const rows = transactions.map(t => [
      t.transaction_date,
      getClientName(t.client_id),
      getAccountName(t.account_id),
      t.description,
      t.type,
      t.amount.toFixed(2),
      t.gst_hst_rate ? `${t.gst_hst_rate}%` : '',
      t.gst_hst_amount ? t.gst_hst_amount.toFixed(2) : '',
      t.reference_number || '',
    ])

    // Build CSV content
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row =>
        row
          .map(cell => {
            // Escape quotes and wrap in quotes if contains comma or quote
            const str = String(cell).replace(/"/g, '""')
            return `"${str}"`
          })
          .join(',')
      ),
    ].join('\n')

    // Return as downloadable file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export transactions' },
      { status: 500 }
    )
  }
}
