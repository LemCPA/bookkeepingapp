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
          setError('Please log in to view dashboard')
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
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">{error}</p>
          {error.includes('log in') && (
            <Link href="/login" className="text-blue-600 hover:text-blue-800 underline mt-2 inline-block">
              Go to Login
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

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
