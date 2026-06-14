import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'
import { supabase, getUserFromSupabase } from '@/lib/supabase-db'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let user = null
    let supabaseUser = null

    // Try Supabase first (production)
    if (supabase) {
      try {
        supabaseUser = await getUserFromSupabase(userId)
        user = supabaseUser
      } catch (supabaseError) {
        console.warn('Supabase user lookup failed, falling back to JSON database')
      }
    }

    // Always check JSON database as primary source
    // (Supabase may not have all columns if table wasn't fully migrated)
    const db = getDb()
    const jsonUser = db.users.find(u => u.id === userId)

    if (!user && jsonUser) {
      // Use JSON user if Supabase lookup failed
      user = jsonUser
    } else if (user && jsonUser) {
      // Merge profile fields from JSON if Supabase is missing them
      user = {
        ...user,
        gst_number: user.gst_number || jsonUser.gst_number,
        gst_registered: user.gst_registered ?? jsonUser.gst_registered,
        business_name: user.business_name || jsonUser.business_name,
        address_street: user.address_street || jsonUser.address_street,
        city: user.city || jsonUser.city,
        province: user.province || jsonUser.province,
        postal_code: user.postal_code || jsonUser.postal_code,
        phone: user.phone || jsonUser.phone,
        business_email: user.business_email || jsonUser.business_email,
        default_gst_hst_rate: user.default_gst_hst_rate ?? jsonUser.default_gst_hst_rate,
      }
    }

    if (!user) {
      console.error('User not found in Supabase or JSON database:', { userId })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch business use percentages from Supabase
    const percentages = { home_business_use_percentage: 100, vehicle_business_use_percentage: 100 } // TODO: implement

    // Convert stored numeric rate to province code for backward compatibility
    const rateToProvince: { [key: number]: string } = {
      5: 'ab',   // Default to Alberta for 5% GST
      13: 'on',  // Ontario HST
      15: 'nb',  // Default to New Brunswick for 15% HST
    }

    const storedRate = user.default_gst_hst_rate
    const provinceCode = (user as any).default_gst_hst_province || (storedRate ? rateToProvince[storedRate] : 'on')
    const displayRate = storedRate !== undefined ? storedRate : 13

    return NextResponse.json({
      default_gst_hst_rate: displayRate,
      default_gst_hst_province: provinceCode,
      gst_registered: user.gst_registered || false,
      gst_number: user.gst_number || '',
      business_name: user.business_name || '',
      address_street: user.address_street || '',
      city: user.city || '',
      province: user.province || '',
      postal_code: user.postal_code || '',
      phone: user.phone || '',
      business_email: user.business_email || '',
      home_business_use_percentage: percentages?.home_business_use_percentage ?? 100,
      vehicle_business_use_percentage: percentages?.vehicle_business_use_percentage ?? 100,
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
      default_gst_hst_province,
      gst_registered,
      gst_number,
      business_name,
      address_street,
      city,
      province,
      postal_code,
      phone,
      business_email,
      home_business_use_percentage,
      vehicle_business_use_percentage,
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

    // Validate percentages if provided
    if (home_business_use_percentage !== undefined) {
      if (!Number.isInteger(home_business_use_percentage) || home_business_use_percentage < 0 || home_business_use_percentage > 100) {
        return NextResponse.json({ error: 'Home business use percentage must be an integer between 0 and 100.' }, { status: 400 })
      }
    }
    if (vehicle_business_use_percentage !== undefined) {
      if (!Number.isInteger(vehicle_business_use_percentage) || vehicle_business_use_percentage < 0 || vehicle_business_use_percentage > 100) {
        return NextResponse.json({ error: 'Vehicle business use percentage must be an integer between 0 and 100.' }, { status: 400 })
      }
    }

    // Prepare update object for JSON database
    const updateData: any = {}
    if (default_gst_hst_rate !== undefined) updateData.default_gst_hst_rate = default_gst_hst_rate
    if (default_gst_hst_province !== undefined) updateData.default_gst_hst_province = default_gst_hst_province
    if (gst_registered !== undefined) updateData.gst_registered = gst_registered
    if (gst_number !== undefined) updateData.gst_number = gst_number
    if (business_name !== undefined) updateData.business_name = business_name
    if (address_street !== undefined) updateData.address_street = address_street
    if (city !== undefined) updateData.city = city
    if (province !== undefined) updateData.province = province
    if (postal_code !== undefined) updateData.postal_code = postal_code
    if (phone !== undefined) updateData.phone = phone
    if (business_email !== undefined) updateData.business_email = business_email
    if (home_business_use_percentage !== undefined) updateData.home_business_use_percentage = home_business_use_percentage
    if (vehicle_business_use_percentage !== undefined) updateData.vehicle_business_use_percentage = vehicle_business_use_percentage

    // Update JSON database (only on local dev, Vercel filesystem is read-only)
    Object.assign(user, updateData)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || process.env.NODE_ENV === 'production'
    if (!isVercel) {
      saveDb(db)
    }

    // Also try to update Supabase (production)
    if (supabase && Object.keys(updateData).length > 0) {
      try {
        const { data: supabaseUser, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single()

        if (error) {
          console.warn('Supabase update warning:', error.message)
          // JSON update already happened, this is just a secondary sync
          // Don't fail the request - user's data is already saved in JSON
        } else if (supabaseUser) {
          // Update local copy with response
          Object.assign(user, supabaseUser)
        }
      } catch (supabaseError) {
        console.warn('Supabase update error (non-fatal):', supabaseError)
        // Don't fail - JSON update already succeeded
      }
    }

    // Fetch updated percentages
    const updatedPercentages = { home_business_use_percentage: 100, vehicle_business_use_percentage: 100 } // TODO: implement

    return NextResponse.json({
      success: true,
      default_gst_hst_rate: user.default_gst_hst_rate,
      default_gst_hst_province: (user as any).default_gst_hst_province,
      gst_registered: user.gst_registered,
      gst_number: user.gst_number,
      business_name: user.business_name,
      address_street: user.address_street,
      city: user.city,
      province: user.province,
      postal_code: user.postal_code,
      phone: user.phone,
      business_email: user.business_email,
      home_business_use_percentage: updatedPercentages?.home_business_use_percentage ?? 100,
      vehicle_business_use_percentage: updatedPercentages?.vehicle_business_use_percentage ?? 100,
    })
  } catch (error: any) {
    console.error('Error updating user settings:', error)
    const errorMessage = error?.message || 'Failed to update settings'
    return NextResponse.json(
      {
        error: `Failed to save profile: ${errorMessage}`,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
