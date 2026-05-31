import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

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
      default_gst_hst_rate: user.default_gst_hst_rate !== undefined ? user.default_gst_hst_rate : 13, // Default to Ontario HST
      gst_registered: user.gst_registered || false,
      gst_number: user.gst_number || '',
      business_name: user.business_name || '',
      address_street: user.address_street || '',
      city: user.city || '',
      province: user.province || '',
      postal_code: user.postal_code || '',
      phone: user.phone || '',
      business_email: user.business_email || '',
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

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'MODIFY_SETTINGS_BLOCKED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot modify settings. Sign up for a free account to use all features.' },
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
    const {
      default_gst_hst_rate,
      gst_registered,
      gst_number,
      business_name,
      address_street,
      city,
      province,
      postal_code,
      phone,
      business_email,
    } = body

    const db = getDb()
    const user = db.users.find(u => u.id === userId)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate rate if provided
    if (default_gst_hst_rate !== undefined && ![0, 5, 13, 15].includes(default_gst_hst_rate)) {
      return NextResponse.json({ error: 'Invalid GST/HST rate. Must be 0, 5, 13, or 15.' }, { status: 400 })
    }

    // Update fields
    if (default_gst_hst_rate !== undefined) user.default_gst_hst_rate = default_gst_hst_rate
    if (gst_registered !== undefined) user.gst_registered = gst_registered
    if (gst_number !== undefined) user.gst_number = gst_number
    if (business_name !== undefined) user.business_name = business_name
    if (address_street !== undefined) user.address_street = address_street
    if (city !== undefined) user.city = city
    if (province !== undefined) user.province = province
    if (postal_code !== undefined) user.postal_code = postal_code
    if (phone !== undefined) user.phone = phone
    if (business_email !== undefined) user.business_email = business_email

    saveDb(db)

    return NextResponse.json({
      success: true,
      default_gst_hst_rate: user.default_gst_hst_rate,
      gst_registered: user.gst_registered,
      gst_number: user.gst_number,
      business_name: user.business_name,
      address_street: user.address_street,
      city: user.city,
      province: user.province,
      postal_code: user.postal_code,
      phone: user.phone,
      business_email: user.business_email,
    })
  } catch (error: any) {
    console.error('Error updating user settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
