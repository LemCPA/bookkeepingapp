import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getOdometerReadings, createOdometerReading } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request) || 1
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year') || '') : undefined

    const readings = getOdometerReadings(userId, year)

    return NextResponse.json({
      readings: readings.map(r => ({
        id: r.id,
        month: r.month,
        startOdometer: r.start_odometer,
        endOdometer: r.end_odometer,
        businessUsePercentage: r.business_use_percentage,
        notes: r.notes,
        totalKm: r.end_odometer - r.start_odometer,
        businessKm: (r.end_odometer - r.start_odometer) * (r.business_use_percentage / 100),
        deductibleAmount: (r.end_odometer - r.start_odometer) * (r.business_use_percentage / 100) * 0.67,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      totalReadings: readings.length,
    })
  } catch (error) {
    console.error('Error fetching mileage readings:', error)
    return NextResponse.json({ error: 'Failed to fetch mileage readings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request) || 1
    const body = await request.json()

    const { month, startOdometer, endOdometer, businessUsePercentage, notes } = body

    // Validation
    if (!month || startOdometer === undefined || endOdometer === undefined || businessUsePercentage === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: month, startOdometer, endOdometer, businessUsePercentage' },
        { status: 400 }
      )
    }

    if (startOdometer >= endOdometer) {
      return NextResponse.json(
        { error: 'Start odometer must be less than end odometer' },
        { status: 400 }
      )
    }

    if (businessUsePercentage < 0 || businessUsePercentage > 100) {
      return NextResponse.json(
        { error: 'Business use percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    const result = createOdometerReading(
      userId,
      month,
      startOdometer,
      endOdometer,
      businessUsePercentage,
      notes
    )

    const totalKm = endOdometer - startOdometer
    const businessKm = totalKm * (businessUsePercentage / 100)
    const deductibleAmount = businessKm * 0.67

    return NextResponse.json(
      {
        id: result.lastID,
        month,
        startOdometer,
        endOdometer,
        businessUsePercentage,
        notes,
        totalKm,
        businessKm,
        deductibleAmount,
        message: 'Mileage reading created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating mileage reading:', error)
    return NextResponse.json({ error: 'Failed to create mileage reading' }, { status: 500 })
  }
}
