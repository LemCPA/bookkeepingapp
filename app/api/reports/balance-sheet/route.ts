import { NextRequest, NextResponse } from 'next/server'
import { getBalanceSheetData } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const month = request.nextUrl.searchParams.get('month')

    if (!month) {
      return NextResponse.json(
        { error: 'month is required' },
        { status: 400 }
      )
    }

    const data = getBalanceSheetData(userId, month)

    // Calculate totals
    const assets = data
      .filter(item => item.type === 'ASSET')
      .reduce((sum, item) => sum + item.balance, 0)

    const liabilities = data
      .filter(item => item.type === 'LIABILITY')
      .reduce((sum, item) => sum + item.balance, 0)

    const equity = data
      .filter(item => item.type === 'EQUITY')
      .reduce((sum, item) => sum + item.balance, 0)

    return NextResponse.json({
      month,
      assets: data.filter(item => item.type === 'ASSET'),
      liabilities: data.filter(item => item.type === 'LIABILITY'),
      equity: data.filter(item => item.type === 'EQUITY'),
      totals: {
        assets,
        liabilities,
        equity,
        totalLiabilitiesEquity: liabilities + equity,
      },
    })
  } catch (error: any) {
    console.error('Balance sheet error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate balance sheet' },
      { status: 500 }
    )
  }
}
