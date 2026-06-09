'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAccessToken } from '@/lib/auth'
import { SUBSCRIPTION_PLANS } from '@/lib/billing-utils'

interface Subscription {
  id: number
  plan: string
  status: string
  trial_end_date?: string | null
  current_period_start: string
  current_period_end: string
  created_at: string
  canceled_at?: string | null
  stripe_subscription_id?: string
}

interface Invoice {
  id: number
  stripe_invoice_id: string
  amount: number
  amount_formatted: string
  currency: string
  status: string
  period_start: string
  period_end: string
  paid_at?: string
  created_at: string
}

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelStep, setCancelStep] = useState<'initial' | 'confirm'>('initial')

  useEffect(() => {
    fetchBillingData()
  }, [])

  async function fetchBillingData() {
    try {
      setLoading(true)
      const token = getAccessToken()
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Fetch subscription
      const subRes = await fetch('/api/billing/subscription', { headers })
      if (subRes.ok) {
        const subData = await subRes.json()
        setSubscription(subData)
      }

      // Fetch invoices
      const invRes = await fetch('/api/billing/invoices', { headers })
      if (invRes.ok) {
        const invData = await invRes.json()
        setInvoices(invData.invoices || [])
      }

      // Fetch payment methods
      const pmRes = await fetch('/api/billing/payment-methods', { headers })
      if (pmRes.ok) {
        const pmData = await pmRes.json()
        if (pmData.payment_methods && pmData.payment_methods.length > 0) {
          setPaymentMethod(pmData.payment_methods[0])
        }
      }
    } catch (err) {
      console.error('Error fetching billing data:', err)
      setError('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelSubscription() {
    if (cancelStep === 'initial') {
      setCancelStep('confirm')
      return
    }

    try {
      setActionLoading(true)
      const token = getAccessToken()
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      setError('')
      setShowCancelConfirm(false)
      setCancelStep('initial')
      // Refresh billing data
      fetchBillingData()
    } catch (err) {
      console.error('Cancel error:', err)
      setError('Failed to cancel subscription. Please try again.')
      setActionLoading(false)
    }
  }

  function handleBackFromCancel() {
    setShowCancelConfirm(false)
    setCancelStep('initial')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center text-gray-600">Loading billing information...</div>
      </div>
    )
  }

  const currentPlan = subscription?.plan || 'free'
  const planDetails = (SUBSCRIPTION_PLANS as Record<string, any>)[currentPlan]
  const isTrialing = subscription?.trial_end_date && new Date(subscription.trial_end_date) > new Date()
  const periodEndDate = subscription?.current_period_end ? new Date(subscription.current_period_end) : null

  // Show cancellation confirmation modal
  if (showCancelConfirm) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {cancelStep === 'initial' ? 'Cancel Subscription?' : 'Confirm Cancellation'}
          </h2>

          {cancelStep === 'initial' ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-900 mb-2">
                  <strong>⚠️ Before you go...</strong>
                </p>
                <p className="text-amber-800 text-sm">
                  If you cancel your {planDetails?.name} subscription, you'll lose access to premium features.
                  Your data will be preserved, but you'll be downgraded to the Free plan.
                </p>
              </div>

              <p className="text-gray-700 mb-6">
                Your subscription will remain active until{' '}
                <strong>{periodEndDate?.toLocaleDateString()}</strong>, then you'll be switched to the Free plan.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleCancelSubscription()}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold transition"
                >
                  {actionLoading ? 'Processing...' : 'Yes, Cancel Subscription'}
                </button>
                <button
                  onClick={handleBackFromCancel}
                  disabled={actionLoading}
                  className="flex-1 bg-gray-200 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 font-semibold transition"
                >
                  Keep Subscription
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-900 font-semibold mb-2">Final Confirmation</p>
                <p className="text-red-800 text-sm">
                  You're about to cancel your {planDetails?.name} subscription. This cannot be undone immediately.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleCancelSubscription()}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold transition"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
                <button
                  onClick={handleBackFromCancel}
                  disabled={actionLoading}
                  className="flex-1 bg-gray-200 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 font-semibold transition"
                >
                  Don't Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-lg text-gray-600">Manage your subscription and payment information</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Current Subscription */}
      <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-blue-600">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Plan</h2>

        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-3xl font-bold text-gray-900">{planDetails?.name || 'Free'}</h3>
              {currentPlan !== 'free' && (
                <span className="text-sm font-medium text-gray-500">
                  {planDetails?.billingPeriod === 'monthly' ? '/month' : '/year'}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-blue-600 mb-4">
              ${planDetails?.price || '0'}
              {currentPlan !== 'free' && (
                <span className="text-sm text-gray-500 font-normal ml-1">
                  {planDetails?.billingPeriod === 'monthly' ? 'per month' : 'per year'}
                </span>
              )}
            </p>

            {/* Plan Features */}
            <div className="space-y-2 mb-6">
              {planDetails?.features.map((feature: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-gray-700">
                  <span className="text-green-600 font-bold">✓</span>
                  {feature}
                </div>
              ))}
            </div>

            {/* Status Info */}
            {isTrialing && subscription?.trial_end_date && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 inline-block">
                <p className="text-sm font-semibold text-amber-900">
                  🎯 Free trial active
                </p>
                <p className="text-sm text-amber-800">
                  Ends on {new Date(subscription.trial_end_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {subscription && !isTrialing && currentPlan !== 'free' && (
              <div className="text-sm text-gray-600">
                <p className="font-medium">Next renewal:</p>
                <p>{periodEndDate?.toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {currentPlan !== 'free' && (
            <div className="flex flex-col gap-3">
              <Link
                href="/pricing"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition text-center"
              >
                Change Plan
              </Link>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method */}
      {currentPlan !== 'free' && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Method</h2>

          {paymentMethod ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">💳</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)} ending in{' '}
                    {paymentMethod.last4}
                  </p>
                  <p className="text-sm text-gray-600">
                    Expires {paymentMethod.exp_month}/{paymentMethod.exp_year}
                  </p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Update
              </Link>
            </div>
          ) : (
            <p className="text-gray-600">No payment method on file</p>
          )}
        </div>
      )}

      {/* Billing History */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing History</h2>

        {invoices.length === 0 ? (
          <p className="text-gray-600">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Period</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-900">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {new Date(invoice.period_start).toLocaleDateString()} -{' '}
                      {new Date(invoice.period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {invoice.amount_formatted || `$${invoice.amount.toFixed(2)}`}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg p-8 border border-blue-200">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Need Help?</h2>
        <p className="text-gray-700 mb-4">
          Have questions about your billing or need assistance with your subscription?
        </p>
        <button
          onClick={() => console.log('Open chat support')}
          className="text-blue-600 hover:text-blue-700 font-semibold"
        >
          💬 Open Support Chat
        </button>
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-gray-600">
        <p>Questions? Check out our <Link href="/faq" className="text-blue-600 hover:text-blue-700">FAQ</Link></p>
      </div>
    </div>
  )
}
