/**
 * Demo Account Security Utilities
 * Implements sandboxing for the demo@bookkeeping.ca account to prevent:
 * - Write operations (create/edit/delete)
 * - Account creation
 * - Rate limit abuse
 * - Access to sensitive data
 */

/**
 * Check if user is the demo account
 */
export function isDemoAccount(userId: string | number | null | undefined): boolean {
  return userId === 1 || userId === '1'
}

/**
 * Check if HTTP method is a write operation (forbidden for demo)
 */
export function isWriteOperation(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
}

/**
 * Rate limiting state for demo account
 * Tracks request timestamps per identifier (userId or IP)
 * Resets on app restart (acceptable for demo security)
 */
const demoRequestCounts = new Map<string, number[]>()

/**
 * Check if demo account request is within rate limit
 * Limit: 60 requests per 60 seconds
 * Returns true if within limit, false if exceeded
 */
export function checkDemoRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const timestamps = demoRequestCounts.get(identifier) || []

  // Remove timestamps outside the window
  const recentTimestamps = timestamps.filter((t) => now - t < windowMs)

  if (recentTimestamps.length >= limit) {
    return false // Rate limit exceeded
  }

  // Add current request timestamp
  recentTimestamps.push(now)
  demoRequestCounts.set(identifier, recentTimestamps)
  return true // Within limit
}

/**
 * Sanitize response data for demo account
 * Removes sensitive fields like stripe_customer_id, gst_number
 */
export function sanitizeDemoData(data: any): any {
  if (!data) return data

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeItem(item))
  }

  return sanitizeItem(data)
}

/**
 * Remove sensitive fields from a single data item
 */
function sanitizeItem(item: any): any {
  if (!item || typeof item !== 'object') {
    return item
  }

  const cleaned = { ...item }

  // Remove sensitive fields
  if (cleaned.stripe_customer_id) {
    delete cleaned.stripe_customer_id
  }
  if (cleaned.gst_number) {
    delete cleaned.gst_number
  }
  if (cleaned.password_hash) {
    delete cleaned.password_hash
  }

  return cleaned
}
