import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken, createJWTToken } from '@/lib/jwt-utils'
import { getUser } from '@/lib/db'
import { emailToUuid } from '@/lib/supabase-db'

/**
 * Refresh access token using refresh token
 * CRITICAL: Uses JWT payload email instead of local DB (which is ephemeral on Vercel)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    // Verify refresh token
    const payload = verifyJWTToken(refreshToken)
    if (!payload || !payload.userId || !payload.email) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    // CRITICAL: Use email from JWT (source of truth) instead of local DB
    // Local database is ephemeral on Vercel and won't have the user after redeploy
    const userEmail = payload.email
    const userId = payload.userId

    // Create new access token using JWT payload (don't query local DB)
    const newAccessToken = createJWTToken(userId, userEmail)

    return NextResponse.json({
      accessToken: newAccessToken,
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    )
  }
}
