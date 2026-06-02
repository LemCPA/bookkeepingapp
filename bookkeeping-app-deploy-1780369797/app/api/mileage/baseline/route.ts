import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getVehicleBaseline, setVehicleBaseline } from '@/lib/db'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request) || 1
    const baseline = getVehicleBaseline(userId)

    if (!baseline) {
      return NextResponse.json({ baseline: null })
    }

    return NextResponse.json({
      id: baseline.id,
      odometerReading: baseline.odometer_reading,
      setupDate: baseline.setup_date,
      notes: baseline.notes,
      createdAt: baseline.created_at,
    })
  } catch (error) {
    console.error('Error fetching vehicle baseline:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicle baseline' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'SET_VEHICLE_BASELINE_BLOCKED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot set vehicle baseline. Sign up for a free account to use all features.' },
        { status: 403 }
      )
    }

    // Rate limiting check
    if (!checkDemoRateLimit(`${userId}`)) {
      logDemoActivity({
        operation: 'RATE_LIMIT_EXCEEDED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 429,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    const { odometerReading, notes, setupDate } = body

    // Validation
    if (odometerReading === undefined || odometerReading < 0) {
      return NextResponse.json(
        { error: 'Odometer reading must be a non-negative number' },
        { status: 400 }
      )
    }

    const result = setVehicleBaseline(userId, odometerReading, notes, setupDate)

    if (!result) {
      return NextResponse.json({ error: 'Failed to set vehicle baseline' }, { status: 500 })
    }

    return NextResponse.json(
      {
        odometerReading,
        notes,
        message: 'Vehicle baseline set successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error setting vehicle baseline:', error)
    return NextResponse.json({ error: 'Failed to set vehicle baseline' }, { status: 500 })
  }
}
