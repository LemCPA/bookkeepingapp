/**
 * Pricing tiers and transaction limits for the bookkeeping app
 * Free: 7-day trial, 20 transaction limit
 * Starter: $9/month, 50 transactions/month
 * Professional: $20/month, 150 transactions/month, team members allowed
 */

export type PlanType = 'free' | 'starter' | 'professional'

export interface PricingTier {
  name: string
  label: string
  price: number
  interval: 'month' | 'trial'
  transactionLimit: number | null // null = unlimited
  monthlyLimit: boolean // true = resets monthly, false = cumulative trial
  features: string[]
  monthlyPrice: number
  trialDays?: number
}

export const PRICING_TIERS: Record<PlanType, PricingTier> = {
  free: {
    name: 'Free',
    label: 'Free',
    price: 0,
    interval: 'trial',
    transactionLimit: null, // unlimited for testing/development
    monthlyLimit: false, // Trial limit is cumulative
    trialDays: 7,
    monthlyPrice: 0,
    features: [
      'Receipt scanning (unlimited)',
      'Transaction tracking',
      'Monthly profit view',
      'Basic reports',
      '7-day access',
    ],
  },
  starter: {
    name: 'Starter',
    label: 'Starter',
    price: 9,
    interval: 'month',
    transactionLimit: 50,
    monthlyLimit: true, // Resets every month
    monthlyPrice: 9,
    features: [
      'Everything in Free, plus:',
      'Advanced financial reports',
      'Bank reconciliation',
      'Tax summary (GST/HST ready)',
      'Invoice management',
    ],
  },
  professional: {
    name: 'Professional',
    label: 'Professional',
    price: 20,
    interval: 'month',
    transactionLimit: 150,
    monthlyLimit: true, // Resets every month
    monthlyPrice: 20,
    features: [
      'Everything in Starter, plus:',
      'Team members access',
      'Advanced analytics',
      'Priority support',
    ],
  },
}

/**
 * Get the pricing tier for a user based on their plan
 */
export function getPricingTier(plan?: string): PricingTier {
  const planType = (plan || 'free') as PlanType
  return PRICING_TIERS[planType] || PRICING_TIERS.free
}

/**
 * Get transaction limit for a user's plan
 */
export function getTransactionLimit(plan?: string): number | null {
  return getPricingTier(plan).transactionLimit
}

/**
 * Check if a user is on a trial (free) plan
 */
export function isTrialPlan(plan?: string): boolean {
  return (plan || 'free') === 'free'
}

/**
 * Check if transaction limits reset monthly (vs cumulative for trial)
 */
export function hasMonthlyLimit(plan?: string): boolean {
  return getPricingTier(plan).monthlyLimit
}

/**
 * Get trial end date (7 days from user creation)
 */
export function getTrialEndDate(createdAt: string): Date {
  const created = new Date(createdAt)
  const trialEnd = new Date(created)
  trialEnd.setDate(trialEnd.getDate() + 7)
  return trialEnd
}

/**
 * Check if trial has expired
 */
export function isTrialExpired(createdAt: string): boolean {
  const trialEnd = getTrialEndDate(createdAt)
  return new Date() > trialEnd
}

/**
 * Get days remaining in trial
 */
export function getDaysRemainingInTrial(createdAt: string): number {
  const trialEnd = getTrialEndDate(createdAt)
  const now = new Date()
  const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, daysRemaining)
}

/**
 * Get the current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Get a specific month in YYYY-MM format
 */
export function getMonth(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
