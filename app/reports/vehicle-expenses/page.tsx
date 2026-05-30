'use client'

import { useEffect, useState } from 'react'
import { createAuthenticatedFetch } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'

interface VehicleExpensesData {
  totalVehicleExpenses: number
  businessUsePercentage: number
  deductibleAmount: number
  transactions: Array<{
    id: number
    transaction_date: string
    description: string
    amount: number
    business_use_percentage?: number
    account_name?: string
  }>
}

export default function VehicleExpensesPage() {
  const currentYear = new Date().getFullYear()
  const [startMonth, setStartMonth] = useState(`${currentYear}-01`)
  const [endMonth, setEndMonth] = useState(`${currentYear}-12`)
  const [data, setData] = useState<VehicleExpensesData | null>(null)
  const [businessUsePercentage, setBusinessUsePercentage] = useState(100)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportType, setReportType] = useState<'detail' | 'summary'>('summary')

  useEffect(() => {
    // Load saved percentage from localStorage
    const savedPercentage = localStorage.getItem('vehicleBusinessUsePercentage')
    if (savedPercentage) {
      setBusinessUsePercentage(parseInt(savedPercentage))
    }
    fetchVehicleExpenses()
  }, [])

  async function fetchVehicleExpenses() {
    setLoading(true)
    setError('')

    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch(
        `/api/reports/vehicle-expenses?startMonth=${startMonth}&endMonth=${endMonth}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch vehicle expenses')
      }

      const result = await response.json()

      // Load saved percentage from localStorage (takes priority over API value)
      const savedPercentage = localStorage.getItem('vehicleBusinessUsePercentage')
      const percentage = savedPercentage ? parseInt(savedPercentage) : 100

      // Update the API result with the saved percentage
      result.businessUsePercentage = percentage
      result.deductibleAmount = result.totalVehicleExpenses * (percentage / 100)

      setData(result)
      setBusinessUsePercentage(percentage)
    } catch (err: any) {
      setError(err.message || 'Error fetching vehicle expenses')
    } finally {
      setLoading(false)
    }
  }

  const handlePercentageChange = (value: number) => {
    const percentage = Math.min(100, Math.max(0, value))
    setBusinessUsePercentage(percentage)
    // Save percentage to localStorage so it persists
    localStorage.setItem('vehicleBusinessUsePercentage', percentage.toString())
    if (data) {
      data.businessUsePercentage = percentage
      data.deductibleAmount = data.totalVehicleExpenses * (percentage / 100)
      setData({ ...data })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6 mt-6">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Vehicle Expenses Report</h1>
          <p className="text-gray-600 mt-2">Track motor vehicle expenses for T2125 reporting</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-[160px] space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Report Options</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Month
                </label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Month
                </label>
                <input
                  type="month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setReportType('summary')
                    fetchVehicleExpenses()
                  }}
                  disabled={loading}
                  className={`w-full py-2 rounded-lg font-medium transition ${
                    reportType === 'summary'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  } disabled:opacity-50`}
                >
                  {loading && reportType === 'summary' ? 'Loading...' : 'Generate Summary Report'}
                </button>
                <button
                  onClick={() => {
                    setReportType('detail')
                    fetchVehicleExpenses()
                  }}
                  disabled={loading}
                  className={`w-full py-2 rounded-lg font-medium transition ${
                    reportType === 'detail'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  } disabled:opacity-50`}
                >
                  {loading && reportType === 'detail' ? 'Loading...' : 'Generate Detail Report'}
                </button>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Use Percentage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={businessUsePercentage}
                    onChange={(e) => handlePercentageChange(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={businessUsePercentage}
                  onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                  className="w-full mt-2"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Loading vehicle expenses data...
              </div>
            ) : data ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-bold text-gray-900">
                      {reportType === 'detail' ? 'Vehicle Transactions' : 'Vehicle Expenses by Category'}
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {reportType === 'detail' && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Date
                            </th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Category
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportType === 'detail' ? (
                          // Detail Report - show all transactions
                          data.transactions.length > 0 ? (
                            data.transactions.map((transaction) => (
                              <tr key={transaction.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {new Date(transaction.transaction_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-blue-600">
                                  {transaction.account_name || 'Other'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                                  {formatCurrency(transaction.amount)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                No vehicle expenses found for this period
                              </td>
                            </tr>
                          )
                        ) : (
                          // Summary Report - group by category and sum
                          (() => {
                            const categoryTotals = new Map<string, number>()
                            data.transactions.forEach((transaction) => {
                              const category = transaction.account_name || 'Other'
                              categoryTotals.set(category, (categoryTotals.get(category) || 0) + transaction.amount)
                            })
                            const sortedCategories = Array.from(categoryTotals.entries()).sort((a, b) => a[0].localeCompare(b[0]))

                            return sortedCategories.length > 0 ? (
                              <>
                                {sortedCategories.map(([category, amount]) => (
                                  <tr key={category} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                                      {category}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                                      {formatCurrency(amount)}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                                  <td className="px-6 py-4 text-sm">
                                    Total
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                                    {formatCurrency(data.totalVehicleExpenses)}
                                  </td>
                                </tr>
                                <tr className="bg-gray-100">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                                    Business Use Percentage
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                                    {businessUsePercentage}%
                                  </td>
                                </tr>
                                <tr className="bg-blue-50 border-b-2 border-blue-300">
                                  <td className="px-6 py-4 text-sm font-bold text-blue-900">
                                    Motor Vehicle Expenses (T2125 Line)
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold text-blue-900 text-right">
                                    {formatCurrency(data.totalVehicleExpenses * (businessUsePercentage / 100))}
                                  </td>
                                </tr>
                              </>
                            ) : (
                              <tr>
                                <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                                  No vehicle expenses found for this period
                                </td>
                              </tr>
                            )
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Select date range and generate report
              </div>
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
    </div>
  )
}
