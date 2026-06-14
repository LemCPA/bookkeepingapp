import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getMileageTrips, createMileageTrip } from '@/lib/db'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request) || 1
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year') || '') : undefined

    const trips = getMileageTrips(userId, year)

    // Calculate aggregates
    let totalKm = 0
    let totalBusinessKm = 0
    const tripsByMonth: { [key: string]: { totalKm: number; businessKm: number; trips: number } } = {}

    trips.forEach(trip => {
      const month = trip.trip_date.substring(0, 7)
      const businessKm = trip.kilometers * (trip.business_percentage / 100)

      totalKm += trip.kilometers
      totalBusinessKm += businessKm

      if (!tripsByMonth[month]) {
        tripsByMonth[month] = { totalKm: 0, businessKm: 0, trips: 0 }
      }
      tripsByMonth[month].totalKm += trip.kilometers
      tripsByMonth[month].businessKm += businessKm
      tripsByMonth[month].trips += 1
    })

    const deductibleAmount = totalBusinessKm * 0.67

    return NextResponse.json({
      trips: trips.map(t => ({
        id: t.id,
        tripDate: t.trip_date,
        kilometers: t.kilometers,
        destination: t.destination,
        purpose: t.purpose,
        businessPercentage: t.business_percentage,
        businessKm: t.kilometers * (t.business_percentage / 100),
        deductibleAmount: t.kilometers * (t.business_percentage / 100) * 0.67,
        notes: t.notes,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
      totalTrips: trips.length,
      totalKm,
      totalBusinessKm,
      totalDeductibleAmount: deductibleAmount,
      tripsByMonth,
    })
  } catch (error) {
    console.error('Error fetching mileage trips:', error)
    return NextResponse.json({ error: 'Failed to fetch mileage trips' }, { status: 500 })
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
        operation: 'CREATE_MILEAGE_TRIP_BLOCKED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot create mileage trips. Sign up for a free account to use all features.' },
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

    const { tripDate, kilometers, destination, businessPercentage, notes } = body

    console.log('POST /api/mileage/trips - Creating trip')
    console.log('  userId from JWT:', userId, 'type:', typeof userId)

    // Validation
    if (!tripDate || kilometers === undefined || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields: tripDate, kilometers, destination' },
        { status: 400 }
      )
    }

    // Derive purpose from businessPercentage
    let purpose = 'business'
    if (businessPercentage === 0) {
      purpose = 'personal'
    } else if (businessPercentage && businessPercentage < 100) {
      purpose = 'mixed'
    }

    if (kilometers < 0) {
      return NextResponse.json(
        { error: 'Kilometers must be a positive number' },
        { status: 400 }
      )
    }

    if (businessPercentage !== undefined && (businessPercentage < 0 || businessPercentage > 100)) {
      return NextResponse.json(
        { error: 'Business percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    const result = createMileageTrip(
      userId,
      tripDate,
      kilometers,
      destination,
      purpose,
      businessPercentage,
      notes
    )

    const businessKm = kilometers * ((businessPercentage ?? 100) / 100)
    const deductibleAmount = businessKm * 0.67

    return NextResponse.json(
      {
        id: result.lastID,
        tripDate,
        kilometers,
        destination,
        purpose,
        businessPercentage: businessPercentage ?? 100,
        businessKm,
        deductibleAmount,
        notes,
        message: 'Mileage trip created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating mileage trip:', error)
    return NextResponse.json({ error: 'Failed to create mileage trip' }, { status: 500 })
  }
}
