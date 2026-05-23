'use client'

import { useState } from 'react'

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 9,
      annualPrice: 99,
      description: 'Perfect for solo freelancers',
      features: [
        'Up to 5 clients',
        'Unlimited transactions',
        'Basic reports (Balance Sheet, Income Statement)',
        'Document uploads (100 MB/month)',
        'Email support',
      ],
      cta: 'Start Free Trial',
      highlighted: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      monthlyPrice: 29,
      annualPrice: 299,
      description: 'For small businesses and accountants',
      features: [
        'Unlimited clients',
        'Unlimited transactions',
        'Advanced reports (Aging, Trends, Reconciliation)',
        'Smart OCR (AI document analysis)',
        'Document uploads (1 GB/month)',
        'GST/HST tracking and filing',
        'Priority email & chat support',
        'Monthly financial summaries',
      ],
      cta: 'Subscribe Now',
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: 99,
      annualPrice: 999,
      description: 'For accounting firms',
      features: [
        'Everything in Professional',
        'Unlimited document storage',
        'API access for integrations',
        'Team collaboration (up to 5 users)',
        'Custom report builder',
        'Dedicated account manager',
        'Phone & email support',
        'Monthly strategy calls',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ]

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId)
    // In a real implementation, this would redirect to Stripe or PayPal
    alert(`Subscribing to ${planId}. In production, this would redirect to payment processor.`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 mb-8">
            Choose the perfect plan for your bookkeeping needs. No hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${
                billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-300"
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                  billingPeriod === 'annual' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${
                billingPeriod === 'annual' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Annual
              <span className="ml-2 text-green-600 font-bold">Save 20%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice
            const period = billingPeriod === 'monthly' ? '/month' : '/year'

            return (
              <div
                key={plan.id}
                className={`relative rounded-lg shadow-lg overflow-hidden transition transform hover:scale-105 ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white ring-2 ring-blue-400 scale-105'
                    : 'bg-white text-gray-900'
                }`}
              >
                {/* Badge */}
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 bg-green-400 text-green-900 px-4 py-1 text-sm font-bold rounded-bl-lg">
                    Popular
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p
                    className={`text-sm mb-6 ${
                      plan.highlighted ? 'text-blue-100' : 'text-gray-600'
                    }`}
                  >
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold">${price}</span>
                      <span className={plan.highlighted ? 'text-blue-100' : 'text-gray-600'}>
                        {period}
                      </span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <p
                        className={`text-sm mt-2 ${
                          plan.highlighted ? 'text-blue-100' : 'text-gray-600'
                        }`}
                      >
                        Billed annually
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full py-3 px-6 rounded-lg font-bold transition mb-8 ${
                      plan.highlighted
                        ? 'bg-white text-blue-600 hover:bg-blue-50'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {plan.cta}
                  </button>

                  {/* Features */}
                  <div className="space-y-4">
                    <p className="font-semibold text-sm opacity-75">Includes:</p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white border-t">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Can I try before I buy?</h3>
              <p className="text-gray-600">
                Yes! All plans come with a 14-day free trial. No credit card required to start.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Can I change plans later?</h3>
              <p className="text-gray-600">
                Absolutely. You can upgrade or downgrade at any time. Changes take effect at the
                start of your next billing cycle.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and
                bank transfers for annual plans.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Is there a contract?</h3>
              <p className="text-gray-600">
                No contracts. You can cancel your subscription anytime. If you cancel, you'll have
                access through the end of your current billing period.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Do you offer discounts for annual billing?</h3>
              <p className="text-gray-600">
                Yes! Annual plans are discounted 20% compared to monthly billing. That's 2 months
                free when you pay annually.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">What happens to my data if I cancel?</h3>
              <p className="text-gray-600">
                Your data is yours. You can export all your data as CSV or JSON before canceling.
                We keep your account available for 30 days in case you want to reactivate.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline your bookkeeping?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Start your free 14-day trial today. No credit card required.
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-50 transition">
            Start Free Trial
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="mb-4">Questions about pricing? We're here to help.</p>
          <p>
            <a href="mailto:support@bookkeepingapp.com" className="text-blue-400 hover:text-blue-300">
              support@bookkeepingapp.com
            </a>
            {' • '}
            <a href="tel:+1234567890" className="text-blue-400 hover:text-blue-300">
              +1 (234) 567-890
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
