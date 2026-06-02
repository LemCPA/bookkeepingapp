// Server-side only authentication functions
// This file should only be imported in API routes, not in client components

import { NextRequest } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-utils'

/**
 * Get user ID from Authorization header (server-side only)
 * Use this in API routes:
 * import { getUserIdFromRequest } from '@/lib/auth-server'
 * const userId = getUserIdFromRequest(request)
 */
export function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const authHeader = request.headers.get('Authorization')
    console.log('[AUTH-SERVER] Auth header present:', !!authHeader)

    // Log all headers for debugging
    const allHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      allHeaders[key] = value.substring(0, 50)
    })
    console.log('[AUTH-SERVER] All request headers:', JSON.stringify(allHeaders, null, 2))

    if (authHeader) {
      console.log('[AUTH-SERVER] Full auth header:', authHeader.substring(0, 40) + '...')
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AUTH-SERVER] Invalid auth header format - returning null')
      console.log('[AUTH-SERVER] authHeader value:', authHeader)
      return null
    }

    const token = authHeader.substring('Bearer '.length)
    console.log('[AUTH-SERVER] Token extracted, length:', token.length)
    console.log('[AUTH-SERVER] Token first 15 chars:', token.substring(0, 15))

    const payload = verifyJWTToken(token)
    console.log('[AUTH-SERVER] JWT verification succeeded:', !!payload)
    if (payload) {
      console.log('[AUTH-SERVER] Extracted userId:', payload.userId, 'type:', typeof payload.userId)
      console.log('[AUTH-SERVER] Extracted email:', payload.email)
    } else {
      console.log('[AUTH-SERVER] JWT verification failed, payload is null/undefined')
    }

    const result = payload?.userId || null
    console.log('[AUTH-SERVER] Final userId to return:', result, 'type:', typeof result)
    return result
  } catch (error) {
    console.error('[AUTH-SERVER] Error getting user ID from request:', error)
    return null
  }
}

/**
 * Validate that a user exists in the database
 * Server-side only
 */
export function isValidUser(userId: number): boolean {
  // For now, we assume any positive userId is valid
  return userId > 0
}
