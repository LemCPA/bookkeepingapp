/**
 * Transaction limit checking and enforcement
 */

import { getDb } from './db'
import { getTransactionLimit, isTrialExpired, getCurrentMonth, getMonth } from './pricing-tiers'

/**
 * Count transactions for a user in the current month
 */
export function countMonthlyTransactions(userId: number, month?: string): number {
  const db = getDb()
  const targetMonth = month || getCurrentMonth()

  return db.transactions.filter(t =>
    t.user_id === userId && t.transaction_date.startsWith(targetMonth)
  ).length
}

/**
 * Count total transactions for a user (for trial limit)
 */
export function countTotalTransactions(userId: number): number {
  const db = getDb()
  return db.transactions.filter(t => t.user_id === userId).length
}

/**
 * Check if user can create a new transaction
 * Returns { allowed: boolean, reason?: string }
 */
export function canCreateTransaction(userId: number, userPlan?: string, userCreatedAt?: string): { allowed: boolean; reason?: string } {
  const user = getDb().users.find(u => u.id === userId)

  if (!user) {
    return { allowed: false, reason: 'User not found' }
  }

  const plan = userPlan || user.plan || 'free'
  const createdAt = userCreatedAt || user.created_at

  // Check if trial has expired (for free plan)
  if (plan === 'free' && isTrialExpired(createdAt)) {
    return { allowed: false, reason: 'Trial period has expired. Please upgrade to continue.' }
  }

  // Get transaction limit for the plan
  const limit = getTransactionLimit(plan)

  // If no limit, user can create transactions
  if (limit === null) {
    return { allowed: true }
  }

  // For free plan, check total transactions
  if (plan === 'free') {
    const totalTxns = countTotalTransactions(userId)
    if (totalTxns >= limit) {
      return {
        allowed: false,
        reason: `Free plan limit reached (${limit} transactions). Please upgrade to continue.`,
      }
    }
  }

  // For paid plans, check monthly transactions
  if (plan === 'starter' || plan === 'professional') {
    const monthlyTxns = countMonthlyTransactions(userId)
    if (monthlyTxns >= limit) {
      return {
        allowed: false,
        reason: `Monthly transaction limit reached (${limit}). Your limit will reset on the 1st of next month.`,
      }
    }
  }

  return { allowed: true }
}

/**
 * Get usage stats for a user
 */
export function getTransactionUsageStats(userId: number) {
  const user = getDb().users.find(u => u.id === userId)

  if (!user) {
    return null
  }

  const plan = user.plan || 'free'
  const createdAt = user.created_at
  const limit = getTransactionLimit(plan)

  if (plan === 'free') {
    const totalTxns = countTotalTransactions(userId)
    const trialExpired = isTrialExpired(createdAt)

    return {
      plan,
      limit,
      used: totalTxns,
      remaining: limit ? Math.max(0, limit - totalTxns) : null,
      trialExpired,
    }
  }

  // Paid plans
  const monthlyTxns = countMonthlyTransactions(userId)

  return {
    plan,
    limit,
    used: monthlyTxns,
    remaining: limit ? Math.max(0, limit - monthlyTxns) : null,
    month: getCurrentMonth(),
  }
}
