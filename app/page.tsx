'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { createAuthenticatedFetch, getStoredUser } from '@/lib/auth'
import TransactionUsage from '@/components/TransactionUsage'

interface DashboardData {
  period: string
  periodStart: string
  periodEnd: string
  plan?: string
  userCreatedAt?: string
  metrics: {
    totalTransactions: number
    totalRevenue: number
    totalExpenses: number
    netIncome: number
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
  useEffect(() => {
    // Handle anchor navigation with fixed header offset
    const handleAnchorScroll = () => {
      const hash = window.location.hash
      if (hash) {
        const element = document.querySelector(hash)
        if (element) {
          // Header is ~64px tall (adjust this value if header height changes)
          const headerOffset = 80
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
          const offsetPosition = elementPosition - headerOffset

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }
    }

    // Handle initial page load
    setTimeout(handleAnchorScroll, 100)

    // Handle hash changes
    window.addEventListener('hashchange', handleAnchorScroll)
    return () => window.removeEventListener('hashchange', handleAnchorScroll)
  }, [])

  return (
    <div className="space-y-2 pt-0 px-4 sm:px-0 max-w-4xl mx-auto">
      {/* Hero Section */}
      <section className="pt-12 pb-16 px-8 m-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg mb-8">
        <div className="max-w-4xl">
          <h1 className="text-5xl font-bold mb-4">
            Bookkeeping Built for Canadian Sole Proprietors 🍁
          </h1>
          <p className="text-lg mb-4 text-blue-100">
            For Uber drivers, Lyft drivers, artists, home business owners, new startups, and every self-employed professional
          </p>
          <p className="text-xl mb-6 opacity-95">
            Stop losing deductions to disorganized finances. Snap receipts, track GST, and file your T2125—all in minutes.
          </p>
          <div className="flex gap-4">
            <Link
              href="/signup"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition"
            >
              Start Your 7-Day Trial
            </Link>
            <Link
              href="/login"
              className="border-2 border-white text-white hover:bg-blue-800 px-8 py-3 rounded-lg font-semibold transition"
            >
              Sign In
            </Link>
          </div>
          <p className="text-sm mt-4 opacity-80">✅ 7-day free trial. Then $12-24/month based on what you need.</p>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          The Sole Proprietor Struggle 💼
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-5xl mb-4">💸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Deductions Getting Lost</h3>
            <p className="text-gray-600">
              A missed $500 deduction costs you $100+ at tax time. Spreadsheets don't remind you what's deductible.
            </p>
          </div>

          <div className="text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">CRA T2125 Chaos</h3>
            <p className="text-gray-600">
              March arrives. You scramble for receipts. Income figures are a guess. Accountant fees spike because of disorganization.
            </p>
          </div>

          <div className="text-center">
            <div className="text-5xl mb-4">⏱️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Manual Spreadsheets</h3>
            <p className="text-gray-600">
              Hours every week formatting data. Hours at year-end preparing for taxes. Time you could spend growing your business.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution: Receipt Scanning */}
      <section className="py-12 bg-blue-50 rounded-lg px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            How Sole Proprietors Save Time & Money
          </h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">📸</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Snap → AI Reads → Done</h3>
                <p className="text-gray-700">
                  Take a photo of a receipt. Our AI extracts date, amount, vendor, and GST—no typing. You verify and save. 15 seconds per receipt. Add 30 receipts/month in under 8 minutes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">✅</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Never Miss a Deduction Again</h3>
                <p className="text-gray-700">
                  Every receipt is automatically categorized by expense type. You see all your deductions organized. No more lost opportunities for tax savings.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">📊</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Know Your Profit Anytime</h3>
                <p className="text-gray-700">
                  Real-time dashboard shows income vs. expenses. See if you're profitable this month. Track GST owing. No guessing when tax time comes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">🇨🇦</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">T2125-Ready & CRA Compliant</h3>
                <p className="text-gray-700">
                  Your data is automatically organized for Canadian tax forms. GST/HST is calculated per province. Your accountant gets clean, organized data. File months early. No April panic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section id="features" className="py-12 scroll-mt-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Built for Sole Proprietor Success
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">📷</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Receipt Scanning</h3>
            <p className="text-gray-600 text-sm">
              Snap, don't type. AI reads receipts instantly. Eliminates manual data entry in seconds per transaction.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">💰</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Never Miss a Deduction</h3>
            <p className="text-gray-600 text-sm">
              Automatic expense categorization. All deductible items tracked. Know exactly what you can claim on your T2125.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">🇨🇦</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">GST/HST Compliant</h3>
            <p className="text-gray-600 text-sm">
              Automatic calculations for all Canadian provinces. Tax filing data ready in minutes, not days.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Profit Dashboard</h3>
            <p className="text-gray-600 text-sm">
              Real-time revenue, expenses, net income. See if you're profitable this month. No guessing.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">T2125-Ready Reports</h3>
            <p className="text-gray-600 text-sm">
              Clean, organized data for your accountant. All numbers ready for CRA forms. No scrambling in March.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy & Security</h3>
            <p className="text-gray-600 text-sm">
              Canadian-built. Your data stays yours. No credit card uploads. No third-party access.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 scroll-mt-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Simple, Transparent Pricing
        </h2>
        <p className="text-center text-gray-600 mb-12">
          Choose the perfect plan for your business
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
            <p className="text-gray-600 mb-6">Perfect for getting started</p>
            <div className="text-4xl font-bold text-gray-900 mb-8">$0<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-sm text-gray-600 mb-8">7-day free trial with 20 transaction limit</p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Receipt scanning</span>
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
              Start Your 7-Day Trial
            </Link>
          </div>

          {/* Starter Plan */}
          <div className="bg-blue-600 text-white rounded-lg shadow p-8 relative transform scale-105">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
              POPULAR
            </div>
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <p className="mb-6 opacity-90">Perfect for growing businesses</p>
            <div className="text-4xl font-bold mb-8">$12<span className="text-lg opacity-90">/month</span></div>
            <p className="text-sm opacity-90 mb-8">30 uploads per month, resets monthly</p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-amber-400 mr-3 text-xl">✓</span>
                <span>Receipt scanning & OCR</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-3 text-xl">✓</span>
                <span>Transaction tracking</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-3 text-xl">✓</span>
                <span>GST/HST reports</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-3 text-xl">✓</span>
                <span>Income & expense reports</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="block w-full text-center bg-white text-blue-600 hover:bg-gray-100 px-4 py-3 rounded-lg font-bold transition"
            >
              Start Your 7-Day Trial
            </Link>
          </div>

          {/* Growth Plan */}
          <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Growth</h3>
            <p className="text-gray-600 mb-6">For active businesses</p>
            <div className="text-4xl font-bold text-gray-900 mb-8">$24<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-sm text-gray-600 mb-8">200 uploads per month, resets monthly</p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Everything in Starter, plus:</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Mileage tracking (CRA-compliant)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span className="text-gray-700">4x higher upload limit</span>
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
              Start Your 7-Day Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Security & Trust Section */}
      <section className="bg-white rounded-lg shadow p-8 mt-12 border-t-4 border-blue-600">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            🔒 Your Data is Safe & Secure
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start">
              <div className="text-3xl mr-4">🔐</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">HTTPS Encrypted</h3>
                <p className="text-gray-600 text-sm">All your data is encrypted in transit. Industry-standard security protects every transaction.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="text-3xl mr-4">💳</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">No Credit Card Storage</h3>
                <p className="text-gray-600 text-sm">We never store your payment information. Payments processed securely by industry leaders.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="text-3xl mr-4">🇨🇦</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">PIPEDA Compliant</h3>
                <p className="text-gray-600 text-sm">We comply with Canadian privacy laws (PIPEDA). Your privacy is protected by law.</p>
                <Link href="/privacy" className="inline-block mt-3 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-sm transition">
                  📋 View PIPEDA Compliance
                </Link>
              </div>
            </div>
            <div className="flex items-start">
              <div className="text-3xl mr-4">🛡️</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Your Data is Yours</h3>
                <p className="text-gray-600 text-sm">We never sell, share, or access your financial information. Built for Canadian sole proprietors who value privacy.</p>
              </div>
            </div>
          </div>
          <p className="text-center text-gray-600 text-sm mt-8">
            Read our full <a href="/privacy" className="text-blue-600 font-semibold hover:underline">Privacy Policy</a> and <a href="/terms" className="text-blue-600 font-semibold hover:underline">Terms of Service</a> for complete details.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg py-16 px-8 text-center mt-12">
        <h2 className="text-4xl font-bold mb-4">Stop Leaving Deductions on the Table</h2>
        <p className="text-xl mb-8 opacity-95">
          Snap your receipts today. Track GST. Prepare your T2125 months early. Try it free for 7 days, then $12-24/month.
        </p>
        <Link
          href="/signup"
          className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-4 rounded-lg font-bold text-lg transition inline-block"
        >
          Start Your 7-Day Trial
        </Link>
        <p className="text-sm mt-6 opacity-80">
          Trusted by Canadian sole proprietors, freelancers, and self-employed professionals. CRA-compliant. Built in Canada. 🍁
        </p>
      </section>
    </div>
  )
}

// Dashboard for authenticated users
function Dashboard({ data }: { data: DashboardData }) {

  return (
    <div className="space-y-4 pt-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm">Overview of your bookkeeping</p>
        </div>
        <Link
          href="/receipts"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
        >
          📷 Snap Document
        </Link>
      </div>

      {/* Transaction Usage Alert */}
      {data.plan && data.userCreatedAt && (
        <TransactionUsage
          plan={data.plan}
          transactionCount={data.metrics.totalTransactions}
          userCreatedAt={data.userCreatedAt}
        />
      )}

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

      {/* Quick Actions */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/invoicing" className="bg-blue-50 rounded-lg shadow hover:shadow-md transition p-4 border border-blue-200">
            <p className="font-semibold text-base text-gray-900">💰 Create Invoice</p>
            <p className="text-sm text-gray-600 mt-1">INCOME — Money you're charging customers</p>
          </Link>

          <Link href="/receipts" className="bg-green-50 rounded-lg shadow hover:shadow-md transition p-4 border border-green-200">
            <p className="font-semibold text-base text-gray-900">💸 Record Receipt</p>
            <p className="text-sm text-gray-600 mt-1">EXPENSES — Money you're spending</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/documents" className="bg-purple-50 rounded-lg shadow hover:shadow-md transition p-3 border border-purple-100">
            <p className="font-semibold text-sm text-gray-900">📄 Documents</p>
            <p className="text-xs text-gray-600 mt-1">Upload & analyze documents</p>
          </Link>

          <Link href="/reports/income-statement" className="bg-indigo-50 rounded-lg shadow hover:shadow-md transition p-3 border border-indigo-100">
            <p className="font-semibold text-sm text-gray-900">📊 Reports</p>
            <p className="text-xs text-gray-600 mt-1">View financial reports</p>
          </Link>
        </div>
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

      {/* Footer Links */}
      <div className="border-t border-gray-200 mt-12 py-6 text-center text-sm text-gray-600">
        <p>
          <a href="/terms" className="hover:text-blue-600 font-medium">Terms of Use</a>
          {' '} | {' '}
          <a href="/disclaimer" className="hover:text-blue-600 font-medium">Disclaimer</a>
        </p>
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
      <div className="flex flex-col min-h-screen pt-20">
        <div className="flex-1">
          <LandingPage />
        </div>
        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-4">
            {/* PIPEDA Badge */}
            <div className="flex justify-center mb-8">
              <Link href="/privacy" className="group">
                <div className="border-2 border-blue-600 rounded-lg p-4 hover:bg-blue-50 transition inline-block">
                  <p className="text-xs font-bold text-blue-600 mb-1">✓ CERTIFIED</p>
                  <p className="font-bold text-gray-900 text-sm">PIPEDA Compliant</p>
                  <p className="text-xs text-gray-600 mt-1">Privacy & Consent</p>
                </div>
              </Link>
            </div>

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