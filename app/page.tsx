'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { createAuthenticatedFetch, getStoredUser } from '@/lib/auth'

interface DashboardData {
  period: string
  periodStart: string
  periodEnd: string
  metrics: {
    totalTransactions: number
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    overdueAR: number
    overdueAP: number
  }
  reconciliation: {
    totalTransactions: number
    reconciled: number
    unreconciled: number
    percentReconciled: number
    lastReconciliation: string | null
  }
  recentTransactions: Array<{
    id: number
    date: string
    description: string
    amount: number
    type: string
    clientName: string
    accountName: string
  }>
  recentDocuments: Array<{
    id: number
    fileName: string
    uploadedAt: string
    transactionId: number
    clientName: string
  }>
}

// Landing page for unauthenticated users
function LandingPage() {
  return (
    <div className="space-y-2">
      {/* Hero Section */}
      <section className="py-12 px-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg mb-8">
        <div className="max-w-4xl">
          <h1 className="text-5xl font-bold mb-4">
            Bookkeeping for Self-Employed
          </h1>
          <p className="text-xl mb-6 opacity-95">
            Stop losing money to disorganized finances. Snap receipts instead of typing. Know your profit. Be tax-ready.
          </p>
          <div className="flex gap-4">
            <Link
              href="/signup"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="border-2 border-white text-white hover:bg-blue-800 px-8 py-3 rounded-lg font-semibold transition"
            >
              Sign In
            </Link>
          </div>
          <p className="text-sm mt-4 opacity-80">14 days free, no credit card required</p>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Your Story. We Get It.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-5xl mb-4">🧾</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Receipts Everywhere</h3>
            <p className="text-gray-600">
              Shoebox of receipts. Notes on your phone. Crumpled papers in your car. Where did that $200 go?
            </p>
          </div>

          <div className="text-center">
            <div className="text-5xl mb-4">⏰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Too Busy</h3>
            <p className="text-gray-600">
              Running the business takes all your time. Bookkeeping feels like a chore you keep putting off.
            </p>
          </div>

          <div className="text-center">
            <div className="text-5xl mb-4">😰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Tax Stress</h3>
            <p className="text-gray-600">
              March comes. You don't know your profit. CRA deadline looms. Time to panic.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution: Receipt Scanning */}
      <section className="py-12 bg-blue-50 rounded-lg px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            The Solution: Receipt Scanning
          </h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">📱</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Snap. Confirm. Done.</h3>
                <p className="text-gray-700">
                  Instead of typing 6 fields (date, amount, vendor, category, GST, account), just take a photo. Our AI extracts the data automatically. You confirm. Transaction recorded. Total time: 15 seconds.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">🧠</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI That Understands Receipts</h3>
                <p className="text-gray-700">
                  We don't ask you to type vendor names or calculate GST. Our AI reads your receipt and knows what's a business expense. You just verify and save.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">📊</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Always Know Your Profit</h3>
                <p className="text-gray-700">
                  Every receipt you snap becomes a transaction. Your dashboard updates automatically. See your real profit at a glance, anytime.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">🇨🇦</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Tax-Ready Automatically</h3>
                <p className="text-gray-700">
                  Every receipt is categorized. GST/HST is calculated. Your tax file is ready months before the deadline. No panic. No last-minute scrambling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section id="features" className="py-12">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Everything You Need
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">📷</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Receipt Scanning</h3>
            <p className="text-gray-600 text-sm">
              Snap receipts with your phone. AI extracts date, amount, vendor, and category automatically.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Profit Dashboard</h3>
            <p className="text-gray-600 text-sm">
              See your revenue, expenses, and net profit at a glance. Know if you're actually making money.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Financial Reports</h3>
            <p className="text-gray-600 text-sm">
              Income statement, balance sheet, tax summary. Everything you need for CRA or your accountant.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">🏦</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bank Reconciliation</h3>
            <p className="text-gray-600 text-sm">
              Match transactions with your bank account. Spot errors instantly. Always accurate.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">💰</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">GST/HST Ready</h3>
            <p className="text-gray-600 text-sm">
              Automatic GST/HST calculations for all provinces. Tax filing takes minutes, not days.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy First</h3>
            <p className="text-gray-600 text-sm">
              Your data stays yours. No credit card uploads. No sketchy 3rd parties. Just secure bookkeeping.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Simple Pricing for Self-Employed
        </h2>
        <p className="text-center text-gray-600 mb-12">
          Start free. Upgrade only when you need to.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
            <p className="text-gray-600 mb-6">Perfect for getting started</p>
            <div className="text-4xl font-bold text-gray-900 mb-8">$0<span className="text-lg text-gray-600">/month</span></div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Receipt scanning (unlimited)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Transaction tracking</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Monthly profit view</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Basic reports</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-3 rounded-lg font-semibold transition"
            >
              Start Free
            </Link>
          </div>

          {/* Starter Plan */}
          <div className="bg-blue-600 text-white rounded-lg shadow p-8 relative transform scale-105">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
              MOST POPULAR
            </div>
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <p className="mb-6 opacity-90">For freelancers & self-employed</p>
            <div className="text-4xl font-bold mb-8">$9<span className="text-lg opacity-90">/month</span></div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-amber-400 mr-3 text-xl">✓</span>
                <span>Everything in Free, plus:</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-3 text-xl">✓</span>
                <span>Advanced financial reports</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-3 text-xl">✓</span>
                <span>Bank reconciliation</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-3 text-xl">✓</span>
                <span>Tax summary (GST/HST ready)</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-3 text-xl">✓</span>
                <span>Invoice management</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center bg-white text-blue-600 hover:bg-gray-100 px-4 py-3 rounded-lg font-bold transition"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Professional Plan */}
          <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
            <p className="text-gray-600 mb-6">For growing teams</p>
            <div className="text-4xl font-bold text-gray-900 mb-8">$29<span className="text-lg text-gray-600">/month</span></div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Everything in Starter, plus:</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Multiple clients/projects</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Advanced analytics</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Team members & roles</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Priority support</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-3 rounded-lg font-semibold transition"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg py-16 px-8 text-center mt-12">
        <h2 className="text-4xl font-bold mb-4">Ready to Stop Losing Money?</h2>
        <p className="text-xl mb-8 opacity-95">
          Start snapping receipts today. Your first 14 days are free. No credit card needed.
        </p>
        <Link
          href="/signup"
          className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-4 rounded-lg font-bold text-lg transition inline-block"
        >
          Get Started Free
        </Link>
        <p className="text-sm mt-6 opacity-80">
          Join hundreds of self-employed Canadians taking control of their finances
        </p>
      </section>
    </div>
  )
}

// Dashboard for authenticated users
function Dashboard({ data }: { data: DashboardData }) {

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm">Overview of your bookkeeping</p>
        </div>
        <Link
          href="/receipts"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
        >
          📷 Snap Receipt
        </Link>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-gray-600 text-xs font-medium">This Month Revenue</p>
          <p className="text-lg font-bold text-green-600 mt-1">${data.metrics.totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-gray-600 text-xs font-medium">This Month Expenses</p>
          <p className="text-lg font-bold text-red-600 mt-1">${data.metrics.totalExpenses.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-gray-600 text-xs font-medium">Net Income</p>
          <p className={`text-lg font-bold mt-1 ${data.metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${data.metrics.netIncome.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-3">
          <p className="text-gray-600 text-xs font-medium">Transactions</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{data.metrics.totalTransactions}</p>
        </div>
      </div>

      {/* Cash Flow & Aging Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow p-3 border-l-4 border-yellow-500">
          <p className="text-gray-600 text-xs font-medium">Overdue A/R</p>
          <p className="text-lg font-bold text-yellow-600 mt-1">${data.metrics.overdueAR.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Outstanding invoices past due</p>
          <Link href="/reports/ar-aging" className="text-blue-600 hover:text-blue-800 text-xs mt-1 inline-block">
            View Details →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-3 border-l-4 border-orange-500">
          <p className="text-gray-600 text-xs font-medium">Overdue A/P</p>
          <p className="text-lg font-bold text-orange-600 mt-1">${data.metrics.overdueAP.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Bills past due date</p>
          <Link href="/reports/ap-aging" className="text-blue-600 hover:text-blue-800 text-xs mt-1 inline-block">
            View Details →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-3 border-l-4 border-blue-500">
          <p className="text-gray-600 text-xs font-medium">Reconciliation</p>
          <p className="text-lg font-bold text-blue-600 mt-1">{data.reconciliation.percentReconciled}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {data.reconciliation.reconciled} of {data.reconciliation.totalTransactions} cleared
          </p>
          <Link href="/reconciliation" className="text-blue-600 hover:text-blue-800 text-xs mt-1 inline-block">
            View Details →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Link href="/transactions/new" className="bg-blue-50 rounded-lg shadow hover:shadow-md transition p-3 border border-blue-100">
          <p className="font-semibold text-sm text-gray-900">➕ New Transaction</p>
          <p className="text-xs text-gray-600 mt-1">Record income or expense</p>
        </Link>

        <Link href="/documents" className="bg-purple-50 rounded-lg shadow hover:shadow-md transition p-3 border border-purple-100">
          <p className="font-semibold text-sm text-gray-900">📄 Documents</p>
          <p className="text-xs text-gray-600 mt-1">Upload & analyze documents</p>
        </Link>

        <Link href="/reports/balance-sheet" className="bg-indigo-50 rounded-lg shadow hover:shadow-md transition p-3 border border-indigo-100">
          <p className="font-semibold text-sm text-gray-900">📊 Reports</p>
          <p className="text-xs text-gray-600 mt-1">View financial reports</p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-900">Recent Transactions</h2>
            <Link href="/transactions" className="text-blue-600 hover:text-blue-800 text-xs font-medium">
              View All
            </Link>
          </div>

          {data.recentTransactions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {data.recentTransactions.map((trans) => (
                <Link
                  key={trans.id}
                  href={`/transactions/${trans.id}`}
                  className="p-2 hover:bg-gray-50 transition block"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{trans.description}</p>
                      <p className="text-xs text-gray-600">{trans.clientName}</p>
                    </div>
                    <p className={`text-xs font-semibold ml-2 whitespace-nowrap ${trans.type === 'INVOICE' ? 'text-green-600' : 'text-red-600'}`}>
                      {trans.type === 'INVOICE' ? '+' : '-'}${trans.amount.toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-gray-500 text-sm">No recent transactions</div>
          )}
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-900">Recent Documents</h2>
            <Link href="/documents" className="text-blue-600 hover:text-blue-800 text-xs font-medium">
              View All
            </Link>
          </div>

          {data.recentDocuments.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {data.recentDocuments.map((doc) => (
                <div key={doc.id} className="p-2 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{doc.fileName}</p>
                      <p className="text-xs text-gray-600">{doc.clientName}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-700 px-1 py-0 rounded ml-2">📎</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-gray-500 text-sm">No recent documents</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Check if user is logged in
        const storedUser = getStoredUser()
        setUser(storedUser)

        if (!storedUser) {
          setLoading(false)
          return
        }

        const authenticatedFetch = createAuthenticatedFetch()
        const res = await authenticatedFetch('/api/dashboard?period=month')

        if (res.status === 401) {
          setError('Unauthorized - Please log in again')
          setLoading(false)
          return
        }

        if (!res.ok) {
          setError(`Error loading dashboard: ${res.statusText}`)
          setLoading(false)
          return
        }

        const json = await res.json()
        setData(json)
      } catch (e) {
        console.error('Error loading dashboard:', e)
        setError('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Loading...</h1>
      </div>
    )
  }

  // Show landing page for unauthenticated users
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1">
          <LandingPage />
        </div>
        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-center gap-8 mb-6 text-sm text-gray-700">
              <Link href="/faq" className="hover:text-blue-600 font-medium">FAQ</Link>
              <Link href="/terms" className="hover:text-blue-600 font-medium">Terms of Use</Link>
              <Link href="/privacy" className="hover:text-blue-600 font-medium">Privacy & PIPEDA</Link>
              <Link href="/disclaimer" className="hover:text-blue-600 font-medium">Disclaimer</Link>
            </div>
            <div className="text-center text-sm text-gray-600 max-w-2xl mx-auto">
              <p className="mb-3">
                <strong>Disclaimer:</strong> This bookkeeping software is provided "as is" without any warranties. Users are solely responsible for maintaining accurate financial records and ensuring compliance with all applicable Canadian federal and provincial tax laws, including GST/HST regulations.
              </p>
              <p className="text-xs text-gray-500">
                &copy; {new Date().getFullYear()} Bookkeeping App. We comply with PIPEDA and Canadian privacy laws. This software is not a substitute for professional accounting advice.
              </p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // Show error if there's one
  if (error && !data) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">{error}</p>
        </div>
      </div>
    )
  }

  // Show dashboard for authenticated users
  return <Dashboard data={data || ({} as DashboardData)} />
}