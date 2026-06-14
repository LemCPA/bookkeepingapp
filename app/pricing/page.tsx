'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { isTrialExpired, getDaysRemainingInTrial } from '@/lib/pricing-tiers'
import { SUBSCRIPTION_PLANS } from '@/lib/billing-utils'

interface UpgradePreview {
  oldPlan: string
  oldPlanKey: string
  oldPlanPrice: number
  newPlan: string
  newPlanPrice: number
  daysUsed: number
  totalDaysInCycle: number
  baseDifference: number
  prorataCharge: number
  netCharge: number
  billingCycleEnd: string
  message: string
}

export default function PricingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userPlan, setUserPlan] = useState<string | null>(null)
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [loading, setLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual')
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false)
  const [upgradePreview, setUpgradePreview] = useState<UpgradePreview | null>(null)
  const [pendingPlan, setPendingPlan] = useState<'starter' | 'growth' | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showNewSubscriptionConfirm, setShowNewSubscriptionConfirm] = useState(false)
  const [subscriptionInProgress, setSubscriptionInProgress] = useState(false)
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)
  const [paymentData, setPaymentData] = useState<{ clientSecret: string; paymentIntentId: string; paymentMethodId?: string; amount: string; planKey: string } | null>(null)
  const [stripe, setStripe] = useState<any>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponError, setCouponError] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percentOff?: number; amountOff?: number } | null>(null)
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' })

  useEffect(() => {
    // Initialize Stripe once on component mount
    const initStripe = async () => {
      const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      if (stripePublishableKey) {
        const stripeInstance = await loadStripe(stripePublishableKey)
        setStripe(stripeInstance)
      }
    }
    initStripe()
  }, [])

  useEffect(() => {
    // Check if user is logged in by fetching dashboard data
    const checkAuth = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
        const response = await fetch('/api/dashboard', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
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
    if (subscriptionInProgress) return

    if (!isLoggedIn) {
      window.location.href = '/login'
      return
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) {
      alert('Please log in again')
      window.location.href = '/login'
      return
    }

    // If user has existing subscription, fetch upgrade preview first
    if (userPlan && userPlan !== 'free') {
      setPreviewLoading(true)
      try {
        const finalPlan = billingPeriod === 'annual' ? `${plan}_annual` : plan
        const response = await fetch('/api/billing/upgrade-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ plan: finalPlan, coupon: couponCode || undefined }),
        })

        if (response.ok) {
          const preview = await response.json()
          setUpgradePreview(preview)
          setPendingPlan(plan as 'starter' | 'growth')
          setShowUpgradeConfirm(true)
        } else {
          alert('Failed to calculate upgrade cost')
        }
      } catch (error) {
        console.error('Preview error:', error)
        alert('Error processing upgrade')
      } finally {
        setPreviewLoading(false)
      }
    } else {
      // New subscription: show generic confirmation
      setPendingPlan(plan)
      setShowNewSubscriptionConfirm(true)
    }
  }

  const proceedToCheckout = async (plan: 'starter' | 'growth') => {
    if (subscriptionInProgress) return

    setSubscriptionInProgress(true)
    setLoading(true)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (!token) {
        alert('Please log in again')
        window.location.href = '/login'
        return
      }

      const finalPlan = billingPeriod === 'annual' ? `${plan}_annual` : plan

      // Simple: Call checkout endpoint, it returns a Stripe Checkout URL
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: finalPlan,
          coupon: couponCode || undefined
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        setErrorModal({ show: true, message: error.error || 'Checkout failed' })
        return
      }

      const data = await response.json()

      // New subscription: redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
      // Upgrade: subscription updated directly (no redirect needed)
      else if (data.success) {
        window.location.href = '/billing?success=true&upgraded=true'
      }
      // Error
      else {
        setErrorModal({ show: true, message: data.message || 'Unable to process payment' })
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setErrorModal({ show: true, message: 'Error processing request' })
    } finally {
      setLoading(false)
      setSubscriptionInProgress(false)
    }
  }

  const confirmUpgradePayment = async () => {
    if (!paymentData) return

    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')

      // CRITICAL: Confirm the payment directly on the backend
      // User has explicitly approved by clicking "Pay $108.00" on OUR interface
      // showing the exact amount, so we confirm the PaymentIntent and update subscription
      console.log('[PAYMENT] Confirming payment for PaymentIntent:', paymentData.paymentIntentId)

      const confirmResponse = await fetch('/api/billing/upgrade/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentIntentId: paymentData.paymentIntentId,
          paymentMethodId: paymentData.paymentMethodId,
        }),
      })

      if (confirmResponse.ok) {
        const data = await confirmResponse.json()
        console.log('[PAYMENT] ✅ Payment confirmed and subscription updated')
        console.log('[PAYMENT] Confirm response:', data)
        setShowPaymentConfirm(false)
        // Redirect to billing page where subscription will show as updated
        window.location.href = '/billing?success=true&upgraded=true'
      } else {
        try {
          const error = await confirmResponse.json()
          console.error('[PAYMENT] ❌ Confirm failed:', error)
          console.error('[PAYMENT] Error details:', JSON.stringify(error, null, 2))
          alert(`Payment failed: ${error.error || JSON.stringify(error)}`)
        } catch (e) {
          console.error('[PAYMENT] ❌ Failed to parse error response')
          alert('Payment processing failed')
        }
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }


  // Normalize userPlan to base name (e.g., "starter_annual" → "starter", "Starter Annual" → "starter")
  const normalizedPlan = userPlan
    ? userPlan
        .toLowerCase()
        .split(/[\s_]/)[0] // Split on space OR underscore
    : null

  // Confirmation modal for NEW subscriptions (not upgrades)
  if (showNewSubscriptionConfirm && pendingPlan) {
    const planDetails = (SUBSCRIPTION_PLANS as Record<string, any>)[
      billingPeriod === 'annual' ? `${pendingPlan}_annual` : pendingPlan
    ]

    return (
      <div className="min-h-screen bg-slate-900/50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirm Subscription</h2>
          <p className="text-slate-600 mb-6">
            You're about to subscribe to a paid plan. Please review before confirming.
          </p>

          {/* Plan Details */}
          <div className="bg-slate-50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-slate-600">Plan</p>
                <p className="text-2xl font-bold text-slate-900">{planDetails?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Price</p>
                <p className="text-2xl font-bold text-blue-600">${planDetails?.price}</p>
                <p className="text-sm text-slate-600">
                  {planDetails?.billingPeriod === 'annual' ? 'per year' : 'per month'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600 mb-2">Features included:</p>
              <ul className="space-y-2 text-sm text-slate-700">
                {planDetails?.features?.slice(0, 3).map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-green-600 mr-2 font-bold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-900">
              ⚠️ By clicking "Subscribe", you authorize us to charge your payment method {planDetails?.billingPeriod === 'annual' ? 'once per year' : 'once per month'}.
            </p>
            <p className="text-sm text-amber-900 mt-2">
              You can cancel anytime from your billing page.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowNewSubscriptionConfirm(false)
                setPendingPlan(null)
              }}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg font-semibold bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-500 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowNewSubscriptionConfirm(false)
                if (pendingPlan) proceedToCheckout(pendingPlan)
              }}
              disabled={loading || subscriptionInProgress}
              className="flex-1 px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 transition"
            >
              {loading ? 'Processing...' : `Subscribe to ${planDetails?.name}`}
            </button>
          </div>
        </div>
      </div>
    )
  }


  // Confirmation modal for upgrades
  if (showUpgradeConfirm && upgradePreview && pendingPlan) {
    return (
      <div className="min-h-screen bg-slate-900/50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Upgrade Your Plan</h2>
          <p className="text-slate-600 mb-6">Here's what your upgrade will cost:</p>

          {/* Breakdown */}
          <div className="bg-slate-50 rounded-lg p-6 mb-6 space-y-3 text-sm">
            {/* Current Plan */}
            <div className="flex justify-between items-center">
              <p className="text-slate-600">Current plan ({upgradePreview.oldPlan})</p>
              <p className="font-semibold text-slate-900">${upgradePreview.oldPlanPrice.toFixed(2)}</p>
            </div>

            {/* New Plan */}
            <div className="flex justify-between items-center">
              <p className="text-slate-600">New plan ({upgradePreview.newPlan})</p>
              <p className="font-semibold text-slate-900">${upgradePreview.newPlanPrice.toFixed(2)}</p>
            </div>

            <div className="border-t border-slate-200 pt-3" />

            {/* Base Difference */}
            <div className="flex justify-between items-center">
              <p className="text-slate-600">Price difference</p>
              <p className={`font-semibold ${upgradePreview.baseDifference >= 0 ? 'text-slate-900' : 'text-slate-900'}`}>
                ${upgradePreview.baseDifference.toFixed(2)}
              </p>
            </div>

            {/* Pro-rata Charge */}
            <div className="flex justify-between items-center">
              <p className="text-slate-600">Plus: {upgradePreview.daysUsed} days used × (${upgradePreview.oldPlanPrice.toFixed(2)} ÷ {upgradePreview.totalDaysInCycle} days)</p>
              <p className="font-semibold text-slate-900">+${upgradePreview.prorataCharge.toFixed(2)}</p>
            </div>

            <div className="border-t-2 border-blue-500 pt-3" />

            {/* Net Amount */}
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded">
              <p className="font-semibold text-slate-900">Amount to Charge Today</p>
              <p className="text-2xl font-bold text-blue-600">${upgradePreview.netCharge.toFixed(2)}</p>
            </div>
          </div>

          {/* Terms */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-900">
              ✓ Your current subscription will be cancelled and refunded for unused time
            </p>
            <p className="text-sm text-amber-900 mt-2">
              ✓ Your new subscription starts immediately with the new plan limits
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowUpgradeConfirm(false)
                setUpgradePreview(null)
                setPendingPlan(null)
              }}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg font-semibold bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-500 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowUpgradeConfirm(false)
                setUpgradePreview(null)
                if (pendingPlan) proceedToCheckout(pendingPlan)
              }}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 transition"
            >
              {loading ? 'Processing...' : 'Continue to Secure Checkout'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Payment confirmation modal for upgrades
  if (showPaymentConfirm && paymentData) {
    return (
      <div className="min-h-screen bg-slate-900/50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirm Payment</h2>
          <p className="text-slate-600 mb-6">You're about to be charged:</p>

          <div className="bg-blue-50 rounded-lg p-6 mb-6 text-center">
            <p className="text-sm text-slate-600 mb-2">Amount</p>
            <p className="text-4xl font-bold text-blue-600">${paymentData.amount}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-900">
              ⚠️ You will be redirected to Stripe to complete this payment securely.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowPaymentConfirm(false)
                setPaymentData(null)
              }}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg font-semibold bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-500 transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmUpgradePayment}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 transition"
            >
              {loading ? 'Processing...' : `Pay $${paymentData.amount}`}
            </button>
          </div>
        </div>
      </div>
    )
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
          {isLoggedIn && normalizedPlan === 'free' && !isTrialExpired(userCreatedAt || '') && (
            <p className="text-base text-amber-600 font-medium">
              ⏰ You have {daysRemaining} days remaining in your free trial
            </p>
          )}
        </div>

        {/* Trial Expiration Warning */}
        {isLoggedIn && normalizedPlan === 'free' && isTrialExpired(userCreatedAt || '') && (
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
              onClick={() => setBillingPeriod('annual')}
              className={`px-8 py-2 rounded-md font-semibold transition-all ${
                billingPeriod === 'annual'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Annual <span className="text-sm ml-2 font-bold">💰 Save 20%</span>
            </button>
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-8 py-2 rounded-md font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Coupon Code Section */}
        <div className="max-w-md mx-auto mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Have a coupon code?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase())
                  setCouponError('')
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={async () => {
                  if (!couponCode.trim()) {
                    setCouponError('Enter a coupon code')
                    return
                  }
                  // Coupon validation will happen at checkout
                  setAppliedCoupon({ code: couponCode })
                  setCouponError('')
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
              >
                Apply
              </button>
            </div>
            {couponError && (
              <p className="text-red-600 text-sm mt-2">{couponError}</p>
            )}
            {appliedCoupon && (
              <p className="text-green-600 text-sm mt-2">✓ Coupon "{appliedCoupon.code}" applied</p>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Free Plan */}
          <div className={`rounded-lg border-2 transition-all ${
            normalizedPlan === 'free'
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-slate-200 bg-white shadow'
          }`}>
            <div className="p-8">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">Free</h2>
                {normalizedPlan === 'free' && (
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
                  10 uploads per month
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
                  {SUBSCRIPTION_PLANS.free?.features?.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-500 mr-3 font-bold">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Starter Plan */}
          <div className={`rounded-lg border-2 transition-all ${
            normalizedPlan === 'starter'
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-slate-200 bg-white shadow'
          }`}>
            <div className="p-8 relative">
              {normalizedPlan !== 'starter' && (
                <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  Popular
                </div>
              )}

              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">Starter</h2>
                {normalizedPlan === 'starter' && (
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
                {billingPeriod === 'annual' ? (
                  <>
                    <p className="text-4xl font-bold text-slate-900">
                      ${Math.round((SUBSCRIPTION_PLANS.starter_annual?.price || 132) / 12)}<span className="text-lg text-slate-600">/month</span>
                    </p>
                    <p className="text-slate-600 text-sm mt-1">
                      Billed ${SUBSCRIPTION_PLANS.starter_annual?.price || 132} annually
                    </p>
                    <p className="text-green-600 font-semibold text-sm mt-2 bg-green-50 px-2 py-1 rounded">
                      ✓ Save ${((SUBSCRIPTION_PLANS.starter?.price || 12) * 12) - (SUBSCRIPTION_PLANS.starter_annual?.price || 132)}/year compared to monthly
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-bold text-slate-900">
                      ${SUBSCRIPTION_PLANS.starter?.price || 12}<span className="text-lg text-slate-600">/month</span>
                    </p>
                  </>
                )}
                <p className="text-slate-600 text-sm mt-3">
                  {SUBSCRIPTION_PLANS.starter?.features?.[0]?.match(/\d+/)?.[0] || 100} uploads per month
                </p>
              </div>

              {/* CTA */}
              {/* Check exact plan match: only disable if user is on THIS exact plan (with billing period) */}
              {(() => {
                const targetPlan = billingPeriod === 'annual' ? 'starter_annual' : 'starter'
                const isCurrentPlan = userPlan === targetPlan
                const basePlan = userPlan?.replace('_annual', '') || ''
                const isUpgrade = basePlan === 'starter' && !isCurrentPlan
                return (
                  <button
                    onClick={() => handleSubscribe('starter')}
                    disabled={isCurrentPlan || loading || !isLoggedIn || subscriptionInProgress}
                    className={`w-full py-3 rounded-lg font-semibold mb-6 transition-all ${
                      isCurrentPlan
                        ? 'bg-slate-100 text-slate-600 cursor-default'
                        : !isLoggedIn
                        ? 'bg-slate-300 text-slate-600 cursor-default'
                        : loading || subscriptionInProgress
                        ? 'bg-blue-400 text-white cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    }`}
                  >
                    {!isLoggedIn ? 'Log in to Subscribe' : loading || subscriptionInProgress ? 'Processing...' : isCurrentPlan ? 'Your Current Plan' : isUpgrade ? 'Upgrade to Starter' : 'Subscribe to Starter'}
                  </button>
                )
              })()}

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
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Home use expense</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Vehicle expenses</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3 font-bold">✓</span>
                    <span>Mileage tracking</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Growth Plan */}
          <div className={`rounded-lg border-2 transition-all ${
            normalizedPlan === 'growth'
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-slate-200 bg-white shadow'
          }`}>
            <div className="p-8">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">Growth</h2>
                {normalizedPlan === 'growth' && (
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
                {billingPeriod === 'annual' ? (
                  <>
                    <p className="text-4xl font-bold text-slate-900">
                      ${Math.round((SUBSCRIPTION_PLANS.growth_annual?.price || 252) / 12)}<span className="text-lg text-slate-600">/month</span>
                    </p>
                    <p className="text-slate-600 text-sm mt-1">
                      Billed ${SUBSCRIPTION_PLANS.growth_annual?.price || 252} annually
                    </p>
                    <p className="text-green-600 font-semibold text-sm mt-2 bg-green-50 px-2 py-1 rounded">
                      ✓ Save ${((SUBSCRIPTION_PLANS.growth?.price || 23) * 12) - (SUBSCRIPTION_PLANS.growth_annual?.price || 252)}/year compared to monthly
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-bold text-slate-900">
                      ${SUBSCRIPTION_PLANS.growth?.price || 23}<span className="text-lg text-slate-600">/month</span>
                    </p>
                  </>
                )}
                <p className="text-slate-600 text-sm mt-3">
                  {SUBSCRIPTION_PLANS.growth?.features?.[0]?.match(/\d+/)?.[0] || 500} uploads per month
                </p>
              </div>

              {/* CTA */}
              {/* Check exact plan match: only disable if user is on THIS exact plan (with billing period) */}
              {(() => {
                const targetPlan = billingPeriod === 'annual' ? 'growth_annual' : 'growth'
                const isCurrentPlan = userPlan === targetPlan
                const basePlan = userPlan?.replace('_annual', '') || ''
                const isUpgrade = basePlan === 'growth' && !isCurrentPlan
                return (
                  <button
                    onClick={() => handleSubscribe('growth')}
                    disabled={isCurrentPlan || loading || !isLoggedIn || subscriptionInProgress}
                    className={`w-full py-3 rounded-lg font-semibold mb-6 transition-all ${
                      isCurrentPlan
                        ? 'bg-slate-100 text-slate-600 cursor-default'
                        : !isLoggedIn
                        ? 'bg-slate-300 text-slate-600 cursor-default'
                        : loading || subscriptionInProgress
                        ? 'bg-blue-400 text-white cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    }`}
                  >
                    {!isLoggedIn ? 'Log in to Subscribe' : loading || subscriptionInProgress ? 'Processing...' : isCurrentPlan ? 'Your Current Plan' : isUpgrade ? 'Upgrade to Growth' : 'Subscribe to Growth'}
                  </button>
                )
              })()}

              {/* Features */}
              <div className="space-y-3">
                <p className="font-semibold text-slate-900 text-sm mb-4">Includes:</p>
                <ul className="space-y-2 text-slate-700 text-sm">
                  {SUBSCRIPTION_PLANS.growth?.features?.length > 0 ? (
                    SUBSCRIPTION_PLANS.growth.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-3 font-bold">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))
                  ) : (
                    <li className="flex items-start">
                      <span className="text-green-500 mr-3 font-bold">✓</span>
                      <span>500 uploads per month</span>
                    </li>
                  )}
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
              <p className="text-slate-600 text-sm">You can upgrade anytime with immediate effect. Downgrades take effect at the end of your billing cycle.</p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Do you offer refunds?</h3>
              <p className="text-slate-600 text-sm">You can cancel anytime and keep access through the end of your billing cycle.</p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">What happens when I hit my upload limit?</h3>
              <p className="text-slate-600 text-sm">You can upgrade your plan anytime to get a higher limit. Your account won't be locked.</p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-slate-600 text-sm">Yes. Submit a cancellation request at least 5 days before the end of your billing cycle, and your account will cancel at the end of that cycle.</p>
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
            © 2026 BookKeep. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold">!</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Unable to Continue</h2>
            </div>

            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {errorModal.message}
            </p>

            <button
              onClick={() => setErrorModal({ show: false, message: '' })}
              className="w-full px-4 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
