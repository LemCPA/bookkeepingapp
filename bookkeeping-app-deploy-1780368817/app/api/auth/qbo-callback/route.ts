import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/qbo-auth'
import { getDb, saveDb, getUser } from '@/lib/db'
import { verifyJWTToken } from '@/lib/jwt-utils'

/**
 * Handle QBO OAuth callback
 * QueryParams: code, realm_id, state
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const realmId = searchParams.get('realmId')
    const state = searchParams.get('state')

    if (!code || !realmId || !state) {
      return NextResponse.json(
        { error: 'Missing required OAuth parameters' },
        { status: 400 }
      )
    }

    // Verify state token to prevent CSRF
    const stateVerify = verifyJWTToken(state)
    if (!stateVerify || !stateVerify.userId) {
      return NextResponse.json(
        { error: 'Invalid state token' },
        { status: 401 }
      )
    }

    const userId = stateVerify.userId

    // Exchange auth code for tokens
    const qboTokens = await exchangeCodeForToken(code)
    if (!qboTokens) {
      return NextResponse.json(
        { error: 'Failed to exchange code for QBO token' },
        { status: 400 }
      )
    }

    // Update user with QBO credentials
    const db = getDb()
    const user = getUser(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Store encrypted QBO tokens (in production, encrypt these)
    user.qbo_access_token = qboTokens.access_token
    user.qbo_refresh_token = qboTokens.refresh_token
    user.qbo_realm_id = realmId
    user.qbo_connected_at = new Date().toISOString()

    saveDb(db)

    // Redirect to dashboard with success message
    const redirectUrl = new URL('/dashboard', request.nextUrl.origin)
    redirectUrl.searchParams.set('qbo_connected', 'true')
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('QBO callback error:', error)
    return NextResponse.json(
      { error: 'Failed to connect QBO account' },
      { status: 500 }
    )
  }
}
