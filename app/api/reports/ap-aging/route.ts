import { NextRequest, NextResponse } from 'next/server'
import { getAPAgingData } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const asOfDate = request.nextUrl.searchParams.get('asOfDate') || new Date().toISOString().split('T')[0]

    // Return summary data
    const agingData = getAPAgingData(userId, asOfDate)

    // Calculate totals across all vendors
    let totalUnpaid = 0
    const bucketTotals: { [key: string]: { totalAmount: number; transactionCount: number } } = {}

    agingData.forEach(row => {
      totalUnpaid += row.totalUnpaid
      row.buckets.forEach(bucket => {
        if (!bucketTotals[bucket.range]) {
          bucketTotals[bucket.range] = { totalAmount: 0, transactionCount: 0 }
        }
        bucketTotals[bucket.range].totalAmount += bucket.totalAmount
        bucketTotals[bucket.range].transactionCount += bucket.transactionCount
      })
    })

    return NextResponse.json({
      asOfDate,
      summary: {
        totalVendors: agingData.length,
        totalUnpaid,
        bucketTotals,
      },
      data: agingData,
    })
  } catch (error: any) {
    console.error('AP Aging report error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate A/P aging report' },
      { status: 500 }
    )
  }
}
