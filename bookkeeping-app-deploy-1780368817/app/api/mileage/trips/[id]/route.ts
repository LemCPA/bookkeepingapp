import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getMileageTrip, updateMileageTrip, deleteMileageTrip } from '@/lib/db'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Extract trip ID from URL path (fallback if params doesn't work)
    const pathname = request.nextUrl.pathname
    const pathMatch = pathname.match(/\/api\/mileage\/trips\/(\d+)/)
    const idFromPath = pathMatch ? pathMatch[1] : undefined
    const { id: paramId } = await params
    const idString = paramId || idFromPath
    const tripId = idString ? parseInt(idString) : NaN

    const extractedUserId = getUserIdFromRequest(request)

    if (!extractedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = extractedUserId

    console.log('[GET /api/mileage/trips/[id]] Looking for trip:', tripId, 'userId:', userId)

    const trip = getMileageTrip(tripId)

    console.log('[GET /api/mileage/trips/[id]] Found trip:', trip ? { id: trip.id, user_id: trip.user_id } : null)
    console.log('[GET /api/mileage/trips/[id]] Comparison: Number(trip.user_id)=', trip ? Number(trip.user_id) : 'N/A', 'Number(userId)=', Number(userId))
    console.log('[GET /api/mileage/trips/[id]] Result:', trip ? (Number(trip.user_id) === Number(userId) ? 'AUTHORIZED' : 'OWNERSHIP CHECK FAILED') : 'TRIP NOT FOUND')

    if (!trip) {
      return NextResponse.json({ error: 'Mileage trip not found [TRIP_NULL]', debug: { tripId, found: false } }, { status: 404 })
    }

    if (Number(trip.user_id) !== Number(userId)) {
      return NextResponse.json({ error: 'Unauthorized [OWNERSHIP_FAILED]', debug: { tripId, tripUserId: trip.user_id, userId, tripUserIdNumber: Number(trip.user_id), userIdNumber: Number(userId) } }, { status: 403 })
    }

    const businessKm = trip.kilometers * (trip.business_percentage / 100)
    const deductibleAmount = businessKm * 0.67

    return NextResponse.json({
      id: trip.id,
      tripDate: trip.trip_date,
      kilometers: trip.kilometers,
      destination: trip.destination,
      purpose: trip.purpose,
      businessPercentage: trip.business_percentage,
      businessKm,
      deductibleAmount,
      notes: trip.notes,
      createdAt: trip.created_at,
      updatedAt: trip.updated_at,
    })
  } catch (error) {
    console.error('Error fetching mileage trip:', error)
    return NextResponse.json({ error: 'Failed to fetch mileage trip' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Extract trip ID from URL path (fallback if params doesn't work)
    const pathname = request.nextUrl.pathname
    const pathMatch = pathname.match(/\/api\/mileage\/trips\/(\d+)/)
    const idFromPath = pathMatch ? pathMatch[1] : undefined
    const { id: paramId } = await params
    const idString = paramId || idFromPath

    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'UPDATE_MILEAGE_TRIP_BLOCKED',
        method: 'PUT',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot modify mileage trips. Sign up for a free account to use all features.' },
        { status: 403 }
      )
    }

    // Rate limiting check
    if (!checkDemoRateLimit(`${userId}`)) {
      logDemoActivity({
        operation: 'RATE_LIMIT_EXCEEDED',
        method: 'PUT',
        endpoint: request.nextUrl.pathname,
        status: 429,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const tripId = idString ? parseInt(idString) : NaN
    const body = await request.json()

    const { tripDate, kilometers, destination, purpose, businessPercentage, notes } = body

    // Check if trip exists and belongs to user
    const trip = getMileageTrip(tripId)
    if (!trip || Number(trip.user_id) !== Number(userId)) {
      return NextResponse.json({ error: 'Mileage trip not found' }, { status: 404 })
    }

    // Validation
    if (kilometers !== undefined && kilometers < 0) {
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

    const updated = updateMileageTrip(
      tripId,
      tripDate,
      kilometers,
      destination,
      purpose,
      businessPercentage,
      notes
    )

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update mileage trip' }, { status: 500 })
    }

    const updatedTrip = getMileageTrip(tripId)
    if (!updatedTrip) {
      return NextResponse.json({ error: 'Failed to retrieve updated trip' }, { status: 500 })
    }

    const businessKm = updatedTrip.kilometers * (updatedTrip.business_percentage / 100)
    const deductibleAmount = businessKm * 0.67

    return NextResponse.json({
      id: updatedTrip.id,
      tripDate: updatedTrip.trip_date,
      kilometers: updatedTrip.kilometers,
      destination: updatedTrip.destination,
      purpose: updatedTrip.purpose,
      businessPercentage: updatedTrip.business_percentage,
      businessKm,
      deductibleAmount,
      notes: updatedTrip.notes,
      message: 'Mileage trip updated successfully',
    })
  } catch (error) {
    console.error('Error updating mileage trip:', error)
    return NextResponse.json({ error: 'Failed to update mileage trip' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Extract trip ID from URL path (fallback if params doesn't work)
    const pathname = request.nextUrl.pathname
    const pathMatch = pathname.match(/\/api\/mileage\/trips\/(\d+)/)
    const idFromPath = pathMatch ? pathMatch[1] : undefined
    const { id: paramId } = await params
    const idString = paramId || idFromPath

    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'DELETE_MILEAGE_TRIP_BLOCKED',
        method: 'DELETE',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot delete mileage trips. Sign up for a free account to use all features.' },
        { status: 403 }
      )
    }

    // Rate limiting check
    if (!checkDemoRateLimit(`${userId}`)) {
      logDemoActivity({
        operation: 'RATE_LIMIT_EXCEEDED',
        method: 'DELETE',
        endpoint: request.nextUrl.pathname,
        status: 429,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const tripId = idString ? parseInt(idString) : NaN

    // Check if trip exists and belongs to user
    const trip = getMileageTrip(tripId)
    if (!trip || Number(trip.user_id) !== Number(userId)) {
      return NextResponse.json({ error: 'Mileage trip not found' }, { status: 404 })
    }

    const deleted = deleteMileageTrip(tripId)

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete mileage trip' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Mileage trip deleted successfully',
      id: tripId,
    })
  } catch (error) {
    console.error('Error deleting mileage trip:', error)
    return NextResponse.json({ error: 'Failed to delete mileage trip' }, { status: 500 })
  }
}
