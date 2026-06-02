import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
const JWT_EXPIRATION = '1h'
const REFRESH_TOKEN_EXPIRATION = '30d'

export interface JWTPayload {
  userId: number
  email: string
  iat?: number
  exp?: number
}

/**
 * Create a JWT token for a user
 */
export function createJWTToken(userId: number, email: string): string {
  const payload: JWTPayload = {
    userId,
    email,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
    algorithm: 'HS256',
  })
}

/**
 * Create a refresh token (longer expiration)
 */
export function createRefreshToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRATION,
    algorithm: 'HS256',
  })
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWTToken(token: string): JWTPayload | null {
  try {
    console.log('[JWT-UTILS] Verifying token with secret length:', JWT_SECRET.length)
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    })
    console.log('[JWT-UTILS] Token verified successfully, userId:', (decoded as JWTPayload).userId)
    return decoded as JWTPayload
  } catch (error: any) {
    console.error('[JWT-UTILS] Token verification error:', error.message || error)
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.substring('Bearer '.length)
}

/**
 * Validate token is not expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = verifyJWTToken(token)
  if (!payload || !payload.exp) {
    return true
  }

  const expirationTime = payload.exp * 1000 // Convert to milliseconds
  const currentTime = Date.now()

  return currentTime > expirationTime
}
