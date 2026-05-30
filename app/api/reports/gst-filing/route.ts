import { NextRequest, NextResponse } from 'next/server'
import { getGstFilingData } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const authHeader = request.headers.get('Authorization')
    console.log('GST Filing API - Auth Header:', authHeader ? 'Present' : 'Missing')

    const userId = getUserIdFromRequest(request)
    console.log('GST Filing API - User ID:', userId)

    if (!userId) {
      console.log('GST Filing API - Returning 401 Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startMonth = searchParams.get('startMonth')
    const endMonth = searchParams.get('endMonth')

    const data = getGstFilingData(userId, startMonth || undefined, endMonth || undefined)

    if (!data) {
      return NextResponse.json(
        { error: 'User not found or not GST registered' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching GST filing data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GST filing data' },
      { status: 500 }
    )
  }
}
