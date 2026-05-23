import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const user = db.users.find(u => u.id === userId)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      default_gst_hst_rate: user.default_gst_hst_rate || 0,
      gst_registered: user.gst_registered || false,
      gst_number: user.gst_number || '',
    })
  } catch (error: any) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { default_gst_hst_rate } = body

    const db = getDb()
    const user = db.users.find(u => u.id === userId)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate rate
    if (![0, 5, 13].includes(default_gst_hst_rate)) {
      return NextResponse.json({ error: 'Invalid GST/HST rate. Must be 0, 5, or 13.' }, { status: 400 })
    }

    user.default_gst_hst_rate = default_gst_hst_rate
    saveDb(db)

    return NextResponse.json({
      success: true,
      default_gst_hst_rate: user.default_gst_hst_rate,
    })
  } catch (error: any) {
    console.error('Error updating user settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
