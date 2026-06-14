import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getChartOfAccounts } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = getChartOfAccounts(userId)
    return NextResponse.json(accounts)
  } catch (error: any) {
    console.error('Error fetching chart of accounts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chart of accounts' },
      { status: 500 }
    )
  }
}
