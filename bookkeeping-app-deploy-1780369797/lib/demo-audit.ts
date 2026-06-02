/**
 * Demo Account Audit Logging
 * Tracks all demo account activity for security monitoring
 */

import fs from 'fs'
import path from 'path'

export interface AuditEntry {
  timestamp: string
  operation: string
  method: string
  endpoint: string
  status: number
  ip?: string
  details?: string
}

const auditLogPath = path.join(process.cwd(), 'data', 'demo-audit.json')

/**
 * Log demo account activity
 * Keeps last 1000 entries for audit trail
 */
export function logDemoActivity(entry: Omit<AuditEntry, 'timestamp'>): void {
  try {
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    }

    // Ensure data directory exists
    const dataDir = path.dirname(auditLogPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    let log: AuditEntry[] = []
    if (fs.existsSync(auditLogPath)) {
      try {
        const data = fs.readFileSync(auditLogPath, 'utf-8')
        log = JSON.parse(data)
        if (!Array.isArray(log)) {
          log = []
        }
      } catch (err) {
        console.error('Failed to parse demo audit log:', err)
        log = []
      }
    }

    log.push(fullEntry)

    // Keep only last 1000 entries
    if (log.length > 1000) {
      log = log.slice(-1000)
    }

    fs.writeFileSync(auditLogPath, JSON.stringify(log, null, 2))
  } catch (err) {
    console.error('Failed to write demo audit log:', err)
  }
}

/**
 * Get all recorded demo audit entries
 */
export function getDemoAuditLog(): AuditEntry[] {
  try {
    if (fs.existsSync(auditLogPath)) {
      const data = fs.readFileSync(auditLogPath, 'utf-8')
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch (err) {
    console.error('Failed to read demo audit log:', err)
  }
  return []
}

/**
 * Clear audit log (for testing)
 */
export function clearDemoAuditLog(): void {
  try {
    if (fs.existsSync(auditLogPath)) {
      fs.unlinkSync(auditLogPath)
    }
  } catch (err) {
    console.error('Failed to clear demo audit log:', err)
  }
}
