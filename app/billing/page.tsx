'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { getAccessToken } from '@/lib/auth'

interface Subscription {
  id: number
  plan: string
  status: string
  trial_end_date?: string | null
  current_period_start: string
  current_period_end: string
  created_at: string
  canceled_at?: string | null
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

const PLAN_DETAILS = {
  starter: { name: 'Starter', price: '$10/month', uploads: '60 uploads/month' },
  growth: { name: 'Growth', price: '$20/month', uploads: '200 uploads/month' },
  free: { name: 'Free', price: 'Free', uploads: 'Limited access' },
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [upgrading, setUpgrading] = useState(false)

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
    } catch (err) {
      console.error('Error fetching billing data:', err)
      setError('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(plan: string) {
    try {
      setUpgrading(true)
      const token = getAccessToken()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan }),
      })

      if (!response.ok) {
        throw new Error('Failed to start checkout')
      }

      const data = await response.json()
      window.location.href = data.url
    } catch (err) {
      console.error('Upgrade error:', err)
      setError('Failed to start upgrade. Please try again.')
      setUpgrading(false)
    }
  }

  async function handleManageBilling() {
    try {
      setUpgrading(true)
      const token = getAccessToken()
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/billing/manage', {
        method: 'POST',
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to access billing portal')
      }

      const data = await response.json()
      window.location.href = data.url
    } catch (err) {
      console.error('Billing portal error:', err)
      setError('Failed to open billing portal. Please try again.')
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">Loading billing information...</div>
      </div>
    )
  }

  const currentPlan = (subscription?.plan as keyof typeof PLAN_DETAILS) || 'free'
  const isTrialing = subscription?.trial_end_date && new Date(subscription.trial_end_date) > new Date()

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription and billing information</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Current Plan</h2>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-blue-900">
                {PLAN_DETAILS[currentPlan]?.name || currentPlan}
              </h3>
              <p className="text-lg text-blue-700 mt-1">
                {PLAN_DETAILS[currentPlan]?.price}
              </p>
              <p className="text-blue-600 mt-1">
                {PLAN_DETAILS[currentPlan]?.uploads}
              </p>

              {isTrialing && (
                <div className="mt-3 p-3 bg-amber-100 border border-amber-300 rounded">
                  <p className="text-sm text-amber-900">
                    <strong>Free trial active</strong>
                    <br />
                    Ends on {new Date(subscription!.trial_end_date!).toLocaleDateString()}
                  </p>
                </div>
              )}

              {subscription && !isTrialing && (
                <div className="mt-3 text-sm text-gray-600">
                  <p>Next renewal: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {currentPlan !== 'free' && (
              <button
                onClick={handleManageBilling}
                disabled={upgrading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {upgrading ? 'Loading...' : 'Manage Billing'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Options */}
      {currentPlan === 'free' || currentPlan === 'starter' ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Upgrade Your Plan</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['growth'].map((plan) => (
              <div key={plan} className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">
                  {PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS]?.name}
                </h3>
                <p className="text-lg font-bold text-blue-600 mb-2">
                  {PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS]?.price}
                </p>
                <p className="text-gray-600 mb-4">
                  {PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS]?.uploads}
                </p>
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={upgrading}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {upgrading ? 'Processing...' : 'Upgrade Now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Billing History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Billing History</h2>

        {invoices.length === 0 ? (
          <p className="text-gray-600">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-semibold">Date</th>
                  <th className="text-left py-2 px-4 font-semibold">Period</th>
                  <th className="text-left py-2 px-4 font-semibold">Amount</th>
                  <th className="text-left py-2 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(invoice.period_start).toLocaleDateString()} -{' '}
                      {new Date(invoice.period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
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
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-3">Need Help?</h2>
        <p className="text-gray-700 mb-3">
          If you have questions about your billing or need to make changes to your subscription, you can:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Click "Manage Billing" to access your Stripe customer portal</li>
          <li>Update your payment method or cancel your subscription anytime</li>
          <li>Contact support for any billing questions</li>
        </ul>
      </div>
    </div>
  )
}
