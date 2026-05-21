import { NextRequest, NextResponse } from 'next/server'
import { getTrendData, getComparisonData, getYearOverYearData } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const startMonth = searchParams.get('startMonth')
    const endMonth = searchParams.get('endMonth')
    const comparisonType = searchParams.get('type') || 'trend'

    if (comparisonType === 'trend') {
      if (!startMonth || !endMonth) {
        return NextResponse.json(
          { error: 'Missing startMonth or endMonth for trend' },
          { status: 400 }
        )
      }
      const trends = getTrendData(userId, startMonth, endMonth)
      return NextResponse.json({ type: 'trend', data: trends })
    } else if (comparisonType === 'period') {
      const period1 = searchParams.get('period1')
      const period2 = searchParams.get('period2')
      if (!period1 || !period2) {
        return NextResponse.json(
          { error: 'Missing period1 or period2 for comparison' },
          { status: 400 }
        )
      }
      const comparison = getComparisonData(userId, period1, period2)
      return NextResponse.json({ type: 'period', data: comparison })
    } else if (comparisonType === 'yoy') {
      const year = searchParams.get('year')
      if (!year) {
        return NextResponse.json(
          { error: 'Missing year for YoY comparison' },
          { status: 400 }
        )
      }
      const yoyData = getYearOverYearData(userId, parseInt(year))
      return NextResponse.json({ type: 'yoy', data: yoyData })
    }

    return NextResponse.json({ error: 'Invalid comparison type' }, { status: 400 })
  } catch (error: any) {
    console.error('Trends report error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate trends report' },
      { status: 500 }
    )
  }
}
