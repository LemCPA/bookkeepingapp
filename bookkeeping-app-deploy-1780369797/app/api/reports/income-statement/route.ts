import { NextRequest, NextResponse } from 'next/server'
import { getIncomeStatementDataByMonths } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

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

    console.log('API: Calling getIncomeStatementDataByMonths with userId:', userId, 'startMonth:', startMonth, 'endMonth:', endMonth)
    const data = getIncomeStatementDataByMonths(userId, startMonth, endMonth)
    console.log('API: Received months from function:', data.months)

    // Return response with debug info in headers
    const response = NextResponse.json(data)
    response.headers.set('X-Debug-Months', JSON.stringify(data.months))
    return response
  } catch (error: any) {
    console.error('Income statement error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate income statement' },
      { status: 500 }
    )
  }
}
