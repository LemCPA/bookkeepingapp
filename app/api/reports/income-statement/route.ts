import { NextRequest, NextResponse } from 'next/server'
import { getIncomeStatementDataByMonths } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getBusinessUsePercentagesFromSupabase } from '@/lib/supabase-db'

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

    // Get business use percentages from query parameters (sent from client localStorage)
    // Fall back to Supabase if not provided
    let homeUsePercentage = parseInt(request.nextUrl.searchParams.get('homePercentage') || '0')
    let vehicleUsePercentage = parseInt(request.nextUrl.searchParams.get('vehiclePercentage') || '0')

    // If not provided in query params, fetch from Supabase
    if (!homeUsePercentage || !vehicleUsePercentage) {
      const percentages = await getBusinessUsePercentagesFromSupabase(userId)
      if (!homeUsePercentage) homeUsePercentage = percentages?.home_business_use_percentage ?? 100
      if (!vehicleUsePercentage) vehicleUsePercentage = percentages?.vehicle_business_use_percentage ?? 100
    }

    console.log('API: Calling getIncomeStatementDataByMonths with userId:', userId, 'startMonth:', startMonth, 'endMonth:', endMonth, 'homeUsePercentage:', homeUsePercentage, 'vehicleUsePercentage:', vehicleUsePercentage)
    const data = getIncomeStatementDataByMonths(userId, startMonth, endMonth, homeUsePercentage, vehicleUsePercentage)
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
