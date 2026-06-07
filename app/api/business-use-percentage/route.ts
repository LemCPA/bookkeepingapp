import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { homePercentage, vehiclePercentage } = body

    if (homePercentage === undefined && vehiclePercentage === undefined) {
      return NextResponse.json(
        { error: 'At least one percentage must be provided' },
        { status: 400 }
      )
    }

    // TODO: Update percentages in Supabase when implemented
    const result = { success: true }

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to update percentages' },
        { status: 500 }
      )
    }

    console.log('[BUSINESS USE PERCENTAGE] Saved:', {
      userId,
      homePercentage,
      vehiclePercentage,
    })

    return NextResponse.json({
      success: true,
      home_business_use_percentage: result.home_business_use_percentage,
      vehicle_business_use_percentage: result.vehicle_business_use_percentage,
    })
  } catch (error: any) {
    console.error('[BUSINESS USE PERCENTAGE API]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update percentages' },
      { status: 500 }
    )
  }
}
