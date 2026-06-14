/**
 * Billing Utilities for Helcim Subscription Management
 * Provides plan configuration, pricing, and billing logic
 */

import { PRICING_PLANS as STRIPE_PRICING } from './stripe-utils'

// Convert Stripe pricing to billing utility format
const buildSubscriptionPlans = () => {
  const plans: Record<string, any> = {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      priceInCents: 0,
      billingPeriod: 'monthly',
      maxClients: 1,
      features: [
        'Basic transaction tracking',
        'Monthly reports',
      ],
    },
  }

  // Map Stripe plans to billing utility format
  const planMap: Record<string, {name: string, billingPeriod: string, maxClients: number, features: string[]}> = {
    starter: {
      name: 'Starter',
      billingPeriod: 'monthly',
      maxClients: 1,
      features: [
        '100 uploads per month',
      ],
    },
    starter_annual: {
      name: 'Starter (Annual)',
      billingPeriod: 'annual',
      maxClients: 1,
      features: [
        '100 uploads per month',
      ],
    },
    growth: {
      name: 'Growth',
      billingPeriod: 'monthly',
      maxClients: 1,
      features: [
        'Everything in Starter',
        '500 uploads per month',
      ],
    },
    growth_annual: {
      name: 'Growth (Annual)',
      billingPeriod: 'annual',
      maxClients: 1,
      features: [
        'Everything in Starter',
        '500 uploads per month',
      ],
    },
  }

  // Build plans from Stripe pricing
  for (const [planId, stripePlan] of Object.entries(STRIPE_PRICING)) {
    if (planId === 'free') continue
    const config = planMap[planId]
    if (config) {
      plans[planId] = {
        id: planId,
        name: config.name,
        price: stripePlan.price,
        priceInCents: Math.round(stripePlan.price * 100),
        billingPeriod: config.billingPeriod,
        maxClients: config.maxClients,
        features: config.features,
      }
    }
  }


  return plans as Record<string, any>
}

export const SUBSCRIPTION_PLANS = buildSubscriptionPlans()

// Keep individual plan exports for backward compatibility
const starterPlan = SUBSCRIPTION_PLANS.starter || {
  id: 'starter',
  name: 'Starter',
  price: 12,
  priceInCents: 1200,
  billingPeriod: 'monthly',
  maxClients: 1,
  features: [
    '1 client account',
    'Transaction tracking and categorization',
    'Monthly and annual reports',
    'Basic bank reconciliation',
    'GST/HST calculation',
    '30 uploads per month',
  ],
}

const starterAnnualPlan = SUBSCRIPTION_PLANS.starter_annual || {
  id: 'starter_annual',
  name: 'Starter (Annual)',
  price: 132,
  priceInCents: 13200,
  billingPeriod: 'annual',
  maxClients: 1,
  features: [
    '1 client account',
    'Transaction tracking and categorization',
    'Monthly and annual reports',
    'Basic bank reconciliation',
    'GST/HST calculation',
    '30 uploads per month',
  ],
}

const growthPlan = SUBSCRIPTION_PLANS.growth || {
  id: 'growth',
  name: 'Growth',
  price: 23,
  priceInCents: 2300,
  billingPeriod: 'monthly',
  maxClients: 1,
  features: [
    'Everything in Starter',
    '500 uploads per month',
  ],
}

const growthAnnualPlan = SUBSCRIPTION_PLANS.growth_annual || {
  id: 'growth_annual',
  name: 'Growth (Annual)',
  price: 252,
  priceInCents: 25200,
  billingPeriod: 'annual',
  maxClients: 1,
  features: [
    '1 client account',
    'Transaction tracking and categorization',
    'Monthly and annual reports',
    'Basic bank reconciliation',
    'GST/HST calculation',
    '500 uploads per month',
  ],
}

export const TRIAL_DURATION_DAYS = parseInt(process.env.TRIAL_DURATION_DAYS || '14')

export interface Plan {
  id: string
  name: string
  price: number
  priceInCents: number
  billingPeriod: string
  maxClients: number | null
  features: string[]
}

export interface SubscriptionStatus {
  isActive: boolean
  isTrialing: boolean
  isPastDue: boolean
  isCanceled: boolean
  daysUntilEnd: number
  isExpiringSoon: boolean
}

/**
 * Get plan configuration by ID
 */
export function getPlan(planId: string): Plan | null {
  return (SUBSCRIPTION_PLANS as Record<string, Plan>)[planId] || null
}

/**
 * Get all available plans (excluding free)
 */
export function getAvailablePlans(): Plan[] {
  return [
    SUBSCRIPTION_PLANS.starter,
    SUBSCRIPTION_PLANS.professional,
    SUBSCRIPTION_PLANS.enterprise,
  ]
}

/**
 * Get free plan
 */
export function getFreePlan(): Plan {
  return SUBSCRIPTION_PLANS.free
}

/**
 * Calculate days remaining in trial
 */
export function getDaysRemainingInTrial(trialEndDate: string | null | undefined): number {
  if (!trialEndDate) return 0

  const today = new Date()
  const endDate = new Date(trialEndDate)
  const diffTime = endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Check if user is within trial period
 */
export function isInTrialPeriod(trialEndDate: string | null | undefined): boolean {
  if (!trialEndDate) return false
  return getDaysRemainingInTrial(trialEndDate) > 0
}

/**
 * Check if trial is expiring soon (within 3 days)
 */
export function isTrialExpiringSoon(trialEndDate: string | null | undefined): boolean {
  if (!trialEndDate) return false
  const daysRemaining = getDaysRemainingInTrial(trialEndDate)
  return daysRemaining > 0 && daysRemaining <= 3
}

/**
 * Calculate trial end date from today
 */
export function calculateTrialEndDate(daysFromNow: number = TRIAL_DURATION_DAYS): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

/**
 * Calculate subscription period end date from start date
 */
export function calculatePeriodEndDate(startDate: string, months: number = 1): string {
  const date = new Date(startDate)
  date.setMonth(date.getMonth() + months)
  return date.toISOString().split('T')[0]
}

/**
 * Get subscription status information
 */
export function getSubscriptionStatus(
  status: string,
  trialEndDate?: string | null,
  periodEndDate?: string
): SubscriptionStatus {
  const isActive = status === 'active'
  const isTrialing = status === 'trialing'
  const isPastDue = status === 'past_due'
  const isCanceled = status === 'canceled'

  let daysUntilEnd = 0
  let isExpiringSoon = false

  if (isTrialing && trialEndDate) {
    daysUntilEnd = getDaysRemainingInTrial(trialEndDate)
    isExpiringSoon = isTrialExpiringSoon(trialEndDate)
  } else if (periodEndDate) {
    const today = new Date()
    const endDate = new Date(periodEndDate)
    const diffTime = endDate.getTime() - today.getTime()
    daysUntilEnd = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    isExpiringSoon = daysUntilEnd > 0 && daysUntilEnd <= 7
  }

  return {
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    daysUntilEnd,
    isExpiringSoon,
  }
}

/**
 * Check if user can create more clients based on plan
 */
export function canCreateMoreClients(planId: string, currentClientCount: number): boolean {
  const plan = getPlan(planId)
  if (!plan) return false

  if (plan.maxClients === null) {
    // Unlimited
    return true
  }

  return currentClientCount < plan.maxClients
}

/**
 * Get remaining client slots for plan
 */
export function getRemainingClientSlots(planId: string, currentClientCount: number): number {
  const plan = getPlan(planId)
  if (!plan) return 0

  if (plan.maxClients === null) {
    // Unlimited
    return Infinity
  }

  return Math.max(0, plan.maxClients - currentClientCount)
}

/**
 * Format price for display
 */
export function formatPrice(priceInCents: number, currency: string = 'CAD'): string {
  const price = priceInCents / 100
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(price)
}

/**
 * Get plan name for display
 */
export function getPlanDisplayName(planId: string): string {
  const plan = getPlan(planId)
  return plan ? plan.name : 'Unknown Plan'
}

/**
 * Calculate prorated amount for plan upgrade/downgrade
 * @param currentPrice - Current plan price in cents
 * @param newPrice - New plan price in cents
 * @param daysInPeriod - Days in billing period (usually 30)
 * @param daysRemaining - Days remaining in current period
 */
export function calculateProratedAmount(
  currentPrice: number,
  newPrice: number,
  daysInPeriod: number = 30,
  daysRemaining: number
): number {
  const currentDailyRate = currentPrice / daysInPeriod
  const newDailyRate = newPrice / daysInPeriod

  // Amount owed for remaining days of current plan
  const creditFromCurrentPlan = currentDailyRate * daysRemaining

  // Amount owed for remaining days of new plan
  const chargeForNewPlan = newDailyRate * daysRemaining

  // Net amount (can be positive or negative)
  return Math.round(chargeForNewPlan - creditFromCurrentPlan)
}
