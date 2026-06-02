import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken, createJWTToken } from '@/lib/jwt-utils'
import { getUser } from '@/lib/db'

/**
 * Refresh access token using refresh token
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
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    // Get user and create new access token
    const user = getUser(payload.userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const newAccessToken = createJWTToken(user.id, user.email)

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
