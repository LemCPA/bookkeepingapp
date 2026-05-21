import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

function chartsOfAccountsToCSV(coas: any[]): string {
  if (coas.length === 0) {
    return 'ID,Code,Name,Type'
  }

  const headers = ['ID', 'Code', 'Name', 'Type']

  const rows = coas.map(coa => [
    coa.id,
    coa.code,
    `"${(coa.name || '').replace(/"/g, '""')}"`,
    coa.type,
  ].join(','))

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

    // Filter accounts for this user only
    const userAccounts = db.chart_of_accounts.filter(a => a.user_id === userId)

    const csv = chartsOfAccountsToCSV(userAccounts)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="chart-of-accounts-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Chart of accounts export error:', error)
    return NextResponse.json({ error: error.message || 'Failed to export chart of accounts' }, { status: 500 })
  }
}
