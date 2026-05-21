import { NextRequest, NextResponse } from 'next/server'
import { getIncomeStatementDataByMonths } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startMonth = request.nextUrl.searchParams.get('startMonth')
    const endMonth = request.nextUrl.searchParams.get('endMonth')

    if (!startMonth || !endMonth) {
      return NextResponse.json(
        { error: 'startMonth and endMonth are required' },
        { status: 400 }
      )
    }

    const data = getIncomeStatementDataByMonths(userId, startMonth, endMonth)

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Income statement error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate income statement' },
      { status: 500 }
    )
  }
}
