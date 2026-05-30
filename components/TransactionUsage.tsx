'use client'

import Link from 'next/link'
import { getPricingTier, isTrialExpired, getDaysRemainingInTrial, getCurrentMonth } from '@/lib/pricing-tiers'

interface TransactionUsageProps {
  plan?: string
  transactionCount: number
  userCreatedAt: string
}

export default function TransactionUsage({
  plan = 'free',
  transactionCount,
  userCreatedAt,
}: TransactionUsageProps) {
  const tier = getPricingTier(plan)
  const isTrialExpiredFlag = isTrialExpired(userCreatedAt)
  const daysRemaining = getDaysRemainingInTrial(userCreatedAt)

  // For trial, show total limit; for paid, show monthly limit
  const limit = tier.transactionLimit || Infinity
  const percentage = limit === Infinity ? 100 : Math.round((transactionCount / limit) * 100)
  const isOverLimit = transactionCount >= limit
  const isNearLimit = percentage >= 80

  // Determine color based on usage
  let statusColor = 'text-green-600'
  let barColor = 'bg-green-500'
  let bgColor = 'bg-green-50'

  if (isTrialExpiredFlag) {
    statusColor = 'text-red-600'
    barColor = 'bg-red-500'
    bgColor = 'bg-red-50'
  } else if (isOverLimit) {
    statusColor = 'text-red-600'
    barColor = 'bg-red-500'
    bgColor = 'bg-red-50'
  } else if (isNearLimit) {
    statusColor = 'text-amber-600'
    barColor = 'bg-amber-500'
    bgColor = 'bg-amber-50'
  }

  return (
    <div className={`${bgColor} rounded-lg shadow p-4 border-l-4 ${isTrialExpiredFlag ? 'border-red-500' : isOverLimit ? 'border-red-500' : isNearLimit ? 'border-amber-500' : 'border-green-500'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-gray-600 text-xs font-medium">Account Status</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-lg font-bold text-gray-900">
              {plan === 'free' ? 'Free Plan' : plan === 'starter' ? 'Starter Plan' : 'Professional Plan'}
            </p>
            {plan === 'free' && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-medium">
                Trial {daysRemaining > 0 ? `(${daysRemaining} days left)` : '(Expired)'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Usage Progress */}
      {limit !== Infinity && (
        <>
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <p className="text-gray-700 text-sm font-medium">
                {plan === 'free' ? 'Trial Transactions' : 'Monthly Transactions'}
              </p>
              <p className={`text-sm font-semibold ${statusColor}`}>
                {transactionCount} / {limit}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${barColor} h-2 rounded-full transition-all`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {limit - transactionCount > 0
                ? `${limit - transactionCount} transactions remaining`
                : 'Limit reached'}
            </p>
          </div>
        </>
      )}

      {/* Trial Expiration Warning */}
      {plan === 'free' && isTrialExpiredFlag && (
        <div className="bg-red-100 border border-red-300 rounded p-3 mb-3">
          <p className="text-red-800 text-sm font-medium">🚨 Trial Period Ended</p>
          <p className="text-red-700 text-xs mt-1">
            Your 7-day free trial has ended. Upgrade to continue using the app.
          </p>
        </div>
      )}

      {/* Near Limit Warning */}
      {isNearLimit && !isTrialExpiredFlag && plan === 'free' && (
        <div className="bg-amber-100 border border-amber-300 rounded p-3 mb-3">
          <p className="text-amber-800 text-sm font-medium">⏰ Trial Ending Soon</p>
          <p className="text-amber-700 text-xs mt-1">
            You're using most of your trial transactions. Plan your next steps.
          </p>
        </div>
      )}

      {/* Upgrade CTA */}
      {(isTrialExpiredFlag || (plan === 'free' && isOverLimit)) && (
        <Link
          href="/pricing"
          className="block text-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold text-sm transition"
        >
          Upgrade Now
        </Link>
      )}

      {isNearLimit && !isTrialExpiredFlag && plan === 'free' && (
        <Link
          href="/pricing"
          className="block text-center border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg font-semibold text-sm transition"
        >
          Explore Plans
        </Link>
      )}

      {/* Plan Info */}
      <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-600">
        {plan === 'free' && (
          <p>
            Free tier includes 20 transactions during your 7-day trial.{' '}
            <Link href="/pricing" className="text-blue-600 hover:text-blue-800 font-medium">
              See pricing →
            </Link>
          </p>
        )}
        {plan === 'starter' && (
          <p>
            Starter: 50 transactions/month for $9. Get advanced reports, bank reconciliation, and invoicing.{' '}
            <Link href="/pricing" className="text-blue-600 hover:text-blue-800 font-medium">
              Compare plans →
            </Link>
          </p>
        )}
        {plan === 'professional' && (
          <p>
            Professional: 150 transactions/month for $20. Includes team members and advanced analytics.
          </p>
        )}
      </div>
    </div>
  )
}
