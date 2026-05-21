import { NextRequest } from 'next/server'

/**
 * Extract and validate user from session token
 * Token format: base64(userId-timestamp)
 */
export function extractUserFromToken(token: string) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [userIdStr] = decoded.split('-')
    const userId = parseInt(userIdStr)

    if (isNaN(userId)) {
      throw new Error('Invalid user ID in token')
    }

    return userId
  } catch (error) {
    console.error('Error extracting user from token:', error)
    return null
  }
}

/**
 * Get user ID from Authorization header
 * Header format: "Bearer <token>"
 */
export function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring('Bearer '.length)
    return extractUserFromToken(token)
  } catch (error) {
    console.error('Error getting user ID from request:', error)
    return null
  }
}

/**
 * Validate that a user exists in the database
 * Server-side only - requires database access
 */
export function isValidUser(userId: number): boolean {
  // This function is server-only and should be called from API routes
  // For now, we assume any positive userId is valid
  return userId > 0
}

/**
 * Get user from localStorage (client-side only)
 * This function is meant to be used in client components
 */
export function getStoredUser() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const userJson = localStorage.getItem('user')
    return userJson ? JSON.parse(userJson) : null
  } catch (error) {
    console.error('Error getting stored user:', error)
    return null
  }
}

/**
 * Get session token from localStorage (client-side only)
 */
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return localStorage.getItem('sessionToken')
  } catch (error) {
    console.error('Error getting session token:', error)
    return null
  }
}

/**
 * Create a fetch function that automatically includes the session token
 */
export function createAuthenticatedFetch(token?: string | null) {
  const sessionToken = token || getSessionToken()

  return async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    } as Record<string, string>

    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`
    }

    return fetch(url, {
      ...options,
      headers,
    })
  }
}

/**
 * Clear authentication data from localStorage
 */
export function clearAuth() {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem('user')
  localStorage.removeItem('sessionToken')
}

/**
 * Set authentication data in localStorage
 */
export function setAuth(user: any, token: string) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('sessionToken', token)
}
