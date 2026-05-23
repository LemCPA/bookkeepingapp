import { NextRequest, NextResponse } from 'next/server'
import { getQBOAuthorizationURL } from '@/lib/qbo-auth'
import { createJWTToken } from '@/lib/jwt-utils'
import { getUserIdFromRequest } from '@/lib/auth-server'

/**
 * Initiate QBO OAuth flow
 * Returns authorization URL that user should visit
 */
export async function POST(request: NextRequest) {
  try {
    // Extract user ID from authorization header
    const userId = getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in first' },
        { status: 401 }
      )
    }

    // Create a state token (JWT) to prevent CSRF
    const stateToken = createJWTToken(userId, 'qbo-oauth-state')

    // Get authorization URL
    const authUrl = getQBOAuthorizationURL(stateToken)

    return NextResponse.json({
      authorizationUrl: authUrl,
      message: 'Visit this URL to authorize QBO access',
    })
  } catch (error) {
    console.error('QBO connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate QBO authorization' },
      { status: 500 }
    )
  }
}
