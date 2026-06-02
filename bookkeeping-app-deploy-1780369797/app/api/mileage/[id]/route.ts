import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getOdometerReading, updateOdometerReading, deleteOdometerReading } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request) || 1
    const { id } = await params
    const readingId = parseInt(id)

    // Check if reading exists and belongs to user
    const reading = getOdometerReading(readingId)
    if (!reading || reading.user_id !== userId) {
      return NextResponse.json({ error: 'Mileage reading not found' }, { status: 404 })
    }

    const totalKm = reading.end_odometer - reading.start_odometer
    const businessKm = totalKm * (reading.business_use_percentage / 100)
    const deductibleAmount = businessKm * 0.67

    return NextResponse.json({
      id: reading.id,
      month: reading.month,
      startOdometer: reading.start_odometer,
      endOdometer: reading.end_odometer,
      businessUsePercentage: reading.business_use_percentage,
      notes: reading.notes,
      totalKm,
      businessKm,
      deductibleAmount,
      createdAt: reading.created_at,
      updatedAt: reading.updated_at,
    })
  } catch (error) {
    console.error('Error fetching mileage reading:', error)
    return NextResponse.json({ error: 'Failed to fetch mileage reading' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request) || 1
    const { id } = await params
    const readingId = parseInt(id)
    const body = await request.json()

    const { month, startOdometer, endOdometer, businessUsePercentage, notes } = body

    // Check if reading exists and belongs to user
    const reading = getOdometerReading(readingId)
    if (!reading || reading.user_id !== userId) {
      return NextResponse.json({ error: 'Mileage reading not found' }, { status: 404 })
    }

    // Validation for updated values
    if (startOdometer !== undefined && endOdometer !== undefined && startOdometer >= endOdometer) {
      return NextResponse.json(
        { error: 'Start odometer must be less than end odometer' },
        { status: 400 }
      )
    }

    if (businessUsePercentage !== undefined && (businessUsePercentage < 0 || businessUsePercentage > 100)) {
      return NextResponse.json(
        { error: 'Business use percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    const updated = updateOdometerReading(
      readingId,
      month,
      startOdometer,
      endOdometer,
      businessUsePercentage,
      notes
    )

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update mileage reading' }, { status: 500 })
    }

    const updatedReading = getOdometerReading(readingId)
    if (!updatedReading) {
      return NextResponse.json({ error: 'Failed to retrieve updated reading' }, { status: 500 })
    }

    const totalKm = updatedReading.end_odometer - updatedReading.start_odometer
    const businessKm = totalKm * (updatedReading.business_use_percentage / 100)
    const deductibleAmount = businessKm * 0.67

    return NextResponse.json({
      id: updatedReading.id,
      month: updatedReading.month,
      startOdometer: updatedReading.start_odometer,
      endOdometer: updatedReading.end_odometer,
      businessUsePercentage: updatedReading.business_use_percentage,
      notes: updatedReading.notes,
      totalKm,
      businessKm,
      deductibleAmount,
      message: 'Mileage reading updated successfully',
    })
  } catch (error) {
    console.error('Error updating mileage reading:', error)
    return NextResponse.json({ error: 'Failed to update mileage reading' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request) || 1
    const { id } = await params
    const readingId = parseInt(id)

    // Check if reading exists and belongs to user
    const reading = getOdometerReading(readingId)
    if (!reading || reading.user_id !== userId) {
      return NextResponse.json({ error: 'Mileage reading not found' }, { status: 404 })
    }

    const deleted = deleteOdometerReading(readingId)

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete mileage reading' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Mileage reading deleted successfully',
      id: readingId,
    })
  } catch (error) {
    console.error('Error deleting mileage reading:', error)
    return NextResponse.json({ error: 'Failed to delete mileage reading' }, { status: 500 })
  }
}
