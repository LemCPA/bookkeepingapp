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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring('Bearer '.length)
    const payload = verifyJWTToken(token)
    return payload?.userId || null
  } catch (error) {
    console.error('Error getting user ID from request:', error)
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
