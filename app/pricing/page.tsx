'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { isTrialExpired, getDaysRemainingInTrial } from '@/lib/pricing-tiers'

export default function PricingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userPlan, setUserPlan] = useState<string | null>(null)
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [loading, setLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  useEffect(() => {
    // Check if user is logged in by fetching dashboard data
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (response.ok) {
          const data = await response.json()
          setIsLoggedIn(true)
          setUserPlan(data.plan || 'free')
          setUserCreatedAt(data.userCreatedAt)
          if (data.userCreatedAt) {
            setDaysRemaining(getDaysRemainingInTrial(data.userCreatedAt))
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      }
    }
    checkAuth()
  }, [])

  const handleSubscribe = async (plan: 'starter' | 'growth') => {
    if (!isLoggedIn) {
      window.location.href = '/login'
      return
    }

    setLoading(true)
    try {
      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

      if (!token) {
        alert('Please log in again')
        window.location.href = '/login'
        return
      }

      // Add _annual suffix if annual billing is selected
      const finalPlan = billingPeriod === 'annual' ? `${plan}_annual` : plan

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: finalPlan }),
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const error = await response.json()
        console.error('Checkout error response:', { status: response.status, error })
        const errorMsg = error.error || `Server error (${response.status})`
        alert(`Checkout Error: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Error creating checkout session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 mb-2">
            Choose the perfect plan for your business
          </p>
          {isLoggedIn && userPlan === 'free' && !isTrialExpired(userCreatedAt || '') && (
            <p className="text-base text-amber-600 font-medium">
              ⏰ You have {daysRemaining} days remaining in your free trial
            </p>
          )}
        </div>

        {/* Trial Expiration Warning */}
        {isLoggedIn && userPlan === 'free' && isTrialExpired(userCreatedAt || '') && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
            <p className="text-red-800 font-semibold">🚨 Trial Period Ended</p>
            <p className="text-red-700 text-sm mt-1">
              Your 7-day free trial has ended. Upgrade now to continue using BookKeep.
            </p>
          </div>
        )}

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingPeriod === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Annual <span className="text-sm ml-1">(Save up to $48)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Free Plan */}
          <div className={`rounded-lg border-2 transition-all ${
            userPlan === 'free'
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-slate-200 bg-white shadow'
          }`}>
            <div className="p-8">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">Free</h2>
                {userPlan === 'free' && (
                  <span className="text-xs font-semibold bg-blue-500 text-white px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                )}
              </div>

              <div className="mb-4">
                <p className="text-slate-600 text-sm mb-2">Perfect for getting started</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <p className="text-4xl font-bold text-slate-900">
                  $0<span className="text-lg text-slate-600">/month</span>
                </p>
                <p className="text-slate-600 text-sm mt-2">
                  7-day free trial with 20 transaction limit
                </p>
              </div>

              {/* CTA */}
              <button
                disabled
                className="w-full py-3 rounded-lg font-semibold bg-slate-100 text-slate-600 cursor-default mb-6"
              >
                Your Current Plan
              </button>

              {/* Features */}
              <div className="space-y-3">
                <p className="font-semibold text-slate-900 text-sm mb-4">Includes:</p>
                <ul className="space-y-2 text-slate-700 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Receipt scanning</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Transaction tracking</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Monthly profit view</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Basic reports</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Starter Plan */}
          <div className={`rounded-lg border-2 transition-all ${
            userPlan === 'starter'
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-slate-200 bg-white shadow'
          }`}>
            <div className="p-8 relative">
              {userPlan !== 'starter' && (
                <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  Popular
                </div>
              )}

              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">Starter</h2>
                {userPlan === 'starter' && (
                  <span className="text-xs font-semibold bg-blue-500 text-white px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                )}
              </div>

              <div className="mb-4">
                <p className="text-slate-600 text-sm mb-2">Perfect for growing businesses</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <p className="text-4xl font-bold text-slate-900">
                  {billingPeriod === 'monthly' ? '$12' : '$120'}
                  <span className="text-lg text-slate-600">
                    {billingPeriod === 'monthly' ? '/month' : '/year'}
                  </span>
                </p>
                {billingPeriod === 'annual' && (
                  <p className="text-green-600 font-semibold text-sm mt-2">
                    💰 Save $24/year ($2/month)
                  </p>
                )}
                <p className="text-slate-600 text-sm mt-2">
                  30 uploads per month, resets monthly
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe('starter')}
                disabled={userPlan === 'starter' || loading || !isLoggedIn}
                className={`w-full py-3 rounded-lg font-semibold mb-6 transition-all ${
                  userPlan === 'starter'
                    ? 'bg-slate-100 text-slate-600 cursor-default'
                    : !isLoggedIn
                    ? 'bg-slate-300 text-slate-600 cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {!isLoggedIn ? 'Log in to Subscribe' : loading ? 'Loading...' : userPlan === 'starter' ? 'Your Current Plan' : 'Subscribe to Starter'}
              </button>

              {/* Features */}
              <div className="space-y-3">
                <p className="font-semibold text-slate-900 text-sm mb-4">Includes:</p>
                <ul className="space-y-2 text-slate-700 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Receipt scanning & OCR</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Transaction tracking</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>GST/HST reports</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Income & expense reports</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Growth Plan */}
          <div className={`rounded-lg border-2 transition-all ${
            userPlan === 'growth'
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-slate-200 bg-white shadow'
          }`}>
            <div className="p-8">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">Growth</h2>
                {userPlan === 'growth' && (
                  <span className="text-xs font-semibold bg-blue-500 text-white px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                )}
              </div>

              <div className="mb-4">
                <p className="text-slate-600 text-sm mb-2">For active businesses</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <p className="text-4xl font-bold text-slate-900">
                  {billingPeriod === 'monthly' ? '$24' : '$240'}
                  <span className="text-lg text-slate-600">
                    {billingPeriod === 'monthly' ? '/month' : '/year'}
                  </span>
                </p>
                {billingPeriod === 'annual' && (
                  <p className="text-green-600 font-semibold text-sm mt-2">
                    💰 Save $48/year ($4/month)
                  </p>
                )}
                <p className="text-slate-600 text-sm mt-2">
                  200 uploads per month, resets monthly
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe('growth')}
                disabled={userPlan === 'growth' || loading || !isLoggedIn}
                className={`w-full py-3 rounded-lg font-semibold mb-6 transition-all ${
                  userPlan === 'growth'
                    ? 'bg-slate-100 text-slate-600 cursor-default'
                    : !isLoggedIn
                    ? 'bg-slate-300 text-slate-600 cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {!isLoggedIn ? 'Log in to Subscribe' : loading ? 'Loading...' : userPlan === 'growth' ? 'Your Current Plan' : `Subscribe to Growth`}
              </button>

              {/* Features */}
              <div className="space-y-3">
                <p className="font-semibold text-slate-900 text-sm mb-4">Everything in Starter, plus:</p>
                <ul className="space-y-2 text-slate-700 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Mileage tracking (CRA-compliant)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>4x higher upload limit</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg p-8 shadow">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Can I change plans later?</h3>
              <p className="text-slate-600 text-sm">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Do you offer refunds?</h3>
              <p className="text-slate-600 text-sm">Yes, we offer a 30-day money-back guarantee. No questions asked.</p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">What happens when I hit my transaction limit?</h3>
              <p className="text-slate-600 text-sm">Your account will be locked from creating new transactions until you upgrade or wait for the monthly reset.</p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-slate-600 text-sm">Absolutely. Cancel anytime with no penalty. You'll keep access through the end of your billing cycle.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          {!isLoggedIn && (
            <div className="bg-blue-50 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to get started?</h2>
              <p className="text-slate-600 mb-6">Try BookKeep free for 7 days. No credit card required.</p>
              <Link
                href="/login"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Sign Up Free
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-600 text-sm">
            © 2026 BookKeep. All rights reserved. Made with ❤️ for Canadian sole proprietors.
          </p>
        </div>
      </footer>
    </div>
  )
}
