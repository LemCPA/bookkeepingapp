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
      <section className="py-3">
        <div className="flex items-center gap-12">
          {/* Left side - Text content */}
          <div className="flex-1">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Your Business Bookkeeping, Simplified
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Professional bookkeeping software for Canadian small businesses, self-employed professionals, startups, and anyone who wants to take control of their finances. Whether you're just starting out or looking to simplify your bookkeeping, we've got you covered.
            </p>
            <div className="flex gap-4">
              <Link
                href="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition"
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg font-semibold transition"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Right side - Image */}
          <div className="flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=250&fit=crop"
              alt="Team working together at computers"
              className="rounded-lg shadow-lg w-80 h-auto"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12 mt-2">
          Built for Your Business
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Transaction Management</h3>
            <p className="text-gray-600">
              Easily record income and expenses. Categorize transactions and maintain detailed records for tax filing.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Client Tracking</h3>
            <p className="text-gray-600">
              Manage multiple clients with unlimited accounts. Track invoices, payments, and aging reports per client.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Financial Reports</h3>
            <p className="text-gray-600">
              Generate balance sheets, income statements, and tax reports. Full reconciliation and audit trails included.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-4">🏦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Bank Reconciliation</h3>
            <p className="text-gray-600">
              Match transactions with bank statements. Identify discrepancies and keep your accounts accurate.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-4">🧾</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Management</h3>
            <p className="text-gray-600">
              Upload receipts, invoices, and supporting documents. AI-powered categorization saves time.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-4">🇨🇦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Canadian Tax Ready</h3>
            <p className="text-gray-600">
              Built for GST/HST, payroll deductions, and Canadian tax requirements. Tax filing made easy.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12 mt-8">
          Plans for Every Business
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free Plan */}
          <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Free</h3>
            <p className="text-gray-600 mb-4">Get started with essentials</p>
            <div className="text-3xl font-bold text-gray-900 mb-6">$0<span className="text-lg text-gray-600">/month</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Basic transaction tracking</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Monthly reports</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-semibold transition"
            >
              Get Started
            </Link>
          </div>

          {/* Starter Plan */}
          <div className="bg-white rounded-lg shadow p-8 border-2 border-blue-600 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Starter</h3>
            <p className="text-gray-600 mb-4">Perfect for freelancers & small teams</p>
            <div className="text-3xl font-bold text-gray-900 mb-6">$9<span className="text-lg text-gray-600">/month</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Transaction categorization</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Monthly & annual reports</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Basic bank reconciliation</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">GST/HST calculation</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Professional Plan */}
          <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Professional</h3>
            <p className="text-gray-600 mb-4">For growing agencies</p>
            <div className="text-3xl font-bold text-gray-900 mb-6">$29<span className="text-lg text-gray-600">/month</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Advanced transaction management</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Multi-month reporting</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Full bank reconciliation</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">Advanced analytics & audit trails</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-semibold transition"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white rounded-lg py-12 px-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to simplify your bookkeeping?</h2>
        <p className="text-lg mb-6 opacity-90">
          Start your free trial today. 14 days free, no credit card required.
        </p>
        <Link
          href="/signup"
          className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition inline-block"
        >
          Get Started Free
        </Link>
      </section>
    </div>
  )
}

// Dashboard for authenticated users
function Dashboard({ data }: { data: DashboardData }) {

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 text-sm">Overview of your bookkeeping</p>
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