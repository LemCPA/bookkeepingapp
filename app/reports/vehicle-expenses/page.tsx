'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createAuthenticatedFetch } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { canAccessReport } from '@/lib/report-access'

interface VehicleExpensesData {
  totalVehicleExpenses: number
  businessUsePercentage: number
  deductibleAmount: number
  categoryBreakdown?: Array<{
    id: number
    name: string
    amount: number
    gst: number
    total: number
  }>
  transactions: Array<{
    id: number
    transaction_date: string
    description: string
    amount: number
    business_use_percentage?: number
    account_name?: string
    gst_hst_amount?: number
  }>
}

export default function VehicleExpensesPage() {
  const currentYear = new Date().getFullYear()

  // Initialize from localStorage, fallback to current year
  const [startMonth, setStartMonth] = useState<string>(() => {
    try {
      return localStorage.getItem('vehicleExpensesStartMonth') || `${currentYear}-01`
    } catch {
      return `${currentYear}-01`
    }
  })

  const [endMonth, setEndMonth] = useState<string>(() => {
    try {
      return localStorage.getItem('vehicleExpensesEndMonth') || `${currentYear}-12`
    } catch {
      return `${currentYear}-12`
    }
  })

  const [data, setData] = useState<VehicleExpensesData | null>(null)
  const [businessUsePercentage, setBusinessUsePercentage] = useState(100)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportType, setReportType] = useState<'detail' | 'summary'>('summary')
  const [percentageMode, setPercentageMode] = useState<'all' | 'individual'>('all')
  const [categoryPercentages, setCategoryPercentages] = useState<{ [categoryId: number]: number }>({})
  const [calculatedDeductibleAmount, setCalculatedDeductibleAmount] = useState(0)
  const [userPlan, setUserPlan] = useState<string>('free')
  const [hasAccess, setHasAccess] = useState(false)

  // Check subscription access
  useEffect(() => {
    async function checkAccess() {
      try {
        const response = await fetch('/api/billing/subscription')
        if (response.ok) {
          const data = await response.json()
          setUserPlan(data.plan || 'free')
          setHasAccess(canAccessReport('vehicle-expenses', data.plan || 'free'))
        }
      } catch (err) {
        console.error('Failed to check subscription:', err)
        setHasAccess(false)
      }
    }
    checkAccess()
  }, [])

  useEffect(() => {
    // Load saved percentage mode and percentages from localStorage
    const savedMode = localStorage.getItem('vehiclePercentageMode') as 'all' | 'individual' || 'all'
    setPercentageMode(savedMode)

    const savedPercentage = localStorage.getItem('vehicleBusinessUsePercentage')
    if (savedPercentage) {
      setBusinessUsePercentage(parseInt(savedPercentage))
    }

    const savedCategoryPercentages = localStorage.getItem('vehicleCategoryPercentages')
    if (savedCategoryPercentages) {
      try {
        setCategoryPercentages(JSON.parse(savedCategoryPercentages))
      } catch (e) {
        console.error('Failed to parse category percentages:', e)
      }
    }

    fetchVehicleExpenses()
  }, [])

  // Save date range to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('vehicleExpensesStartMonth', startMonth)
      localStorage.setItem('vehicleExpensesEndMonth', endMonth)
    } catch (error) {
      console.error('Failed to save vehicle expense date range:', error)
    }
  }, [startMonth, endMonth])

  // Recalculate deductible amount whenever data, percentages, or mode change
  useEffect(() => {
    if (!data || !data.categoryBreakdown) return

    const categories = data.categoryBreakdown
    let totalDeductibleAmount = 0

    categories.forEach((category) => {
      const categoryPercent = percentageMode === 'individual' && categoryPercentages[category.id] !== undefined
        ? categoryPercentages[category.id]
        : businessUsePercentage
      const categoryPercentDecimal = categoryPercent / 100
      totalDeductibleAmount += category.amount * categoryPercentDecimal // Only the expense amount, not GST
    })

    setCalculatedDeductibleAmount(totalDeductibleAmount)
  }, [data, percentageMode, businessUsePercentage, categoryPercentages])

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
      // Calculate deductible from total (subtotal + GST)
      const totalWithGst = result.categoryBreakdown?.reduce((sum: number, c: any) => sum + (c.total || 0), 0) || 0
      result.deductibleAmount = totalWithGst * (percentage / 100)

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
      // Calculate deductible from total (subtotal + GST)
      const totalWithGst = data.categoryBreakdown?.reduce((sum, c) => sum + (c.total || 0), 0) || 0
      data.deductibleAmount = totalWithGst * (percentage / 100)
      setData({ ...data })
    }
  }

  const handleCategoryPercentageChange = (categoryId: number, value: number) => {
    const percentage = Math.min(100, Math.max(0, value))
    const newPercentages = { ...categoryPercentages, [categoryId]: percentage }
    setCategoryPercentages(newPercentages)
    localStorage.setItem('vehicleCategoryPercentages', JSON.stringify(newPercentages))
  }

  const handlePercentageModeChange = (mode: 'all' | 'individual') => {
    setPercentageMode(mode)
    localStorage.setItem('vehiclePercentageMode', mode)
  }

  const getPercentageForCategory = (categoryId: number): number => {
    if (percentageMode === 'individual' && categoryPercentages[categoryId] !== undefined) {
      return categoryPercentages[categoryId]
    }
    return businessUsePercentage
  }

  // Show upgrade prompt if user doesn't have access
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h1>
            <p className="text-gray-600 mb-6">Vehicle Expenses Report is available on Starter and Growth plans.</p>
            <p className="text-gray-600 mb-8">You're currently on the <strong>{userPlan}</strong> plan.</p>
            <Link
              href="/billing"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    )
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
            <div className="bg-white rounded-lg shadow p-4 sticky top-[160px] space-y-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Report Options</h2>
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

              <button
                onClick={() => {
                  setReportType('summary')
                  fetchVehicleExpenses()
                }}
                disabled={loading}
                className="w-full py-2 rounded-lg font-medium transition bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </button>

              <div className="border-t pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Percentage Method
                </label>
                <div className="space-y-2 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={percentageMode === 'all'}
                      onChange={() => handlePercentageModeChange('all')}
                      className="cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Apply to All Categories</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={percentageMode === 'individual'}
                      onChange={() => handlePercentageModeChange('individual')}
                      className="cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Individual by Category</span>
                  </label>
                </div>
              </div>

              <div className="border-t pt-2">
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg shadow p-3">
                    <p className="text-sm text-gray-600">Total (with GST)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(data.categoryBreakdown?.reduce((sum, c) => sum + c.total, 0) || 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-3">
                    <p className="text-sm text-gray-600">Deductible Amount ({percentageMode === 'individual' ? 'Varies' : businessUsePercentage + '%'})</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(calculatedDeductibleAmount)}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 py-2 border-b">
                    <h2 className="text-lg font-bold text-gray-900">
                      {reportType === 'detail' ? 'Vehicle Transactions' : 'Vehicle Expenses by Category'}
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {reportType === 'detail' && (
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                              Date
                            </th>
                          )}
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                            Category
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">
                            Total (100%)
                          </th>
                          {reportType === 'summary' && (
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">
                              Percentage
                            </th>
                          )}
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">
                            Business Use $
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">
                            GST/HST
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportType === 'detail' ? (
                          // Detail Report - show all transactions
                          data.transactions.length > 0 ? (
                            data.transactions.map((transaction, idx) => (
                              <tr key={transaction.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {new Date(transaction.transaction_date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-blue-600">
                                  {transaction.account_name || 'Other'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  {formatCurrency(transaction.amount)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  {formatCurrency(transaction.amount ? transaction.gst_hst_amount || 0 : 0)}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                                  {formatCurrency((transaction.amount || 0) + (transaction.gst_hst_amount || 0))}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                No vehicle expenses found for this period
                              </td>
                            </tr>
                          )
                        ) : (
                          // Summary Report - show all vehicle expense categories with per-category percentages
                          (() => {
                            const categories = data.categoryBreakdown || []
                            const totalSubtotal = data.categoryBreakdown?.reduce((sum, c) => sum + c.amount, 0) || 0
                            const totalGstAmount = data.categoryBreakdown?.reduce((sum, c) => sum + c.gst, 0) || 0

                            // Calculate per-category totals
                            let totalDeductibleAmount = 0
                            let totalDeductibleGst = 0
                            categories.forEach((category) => {
                              const categoryPercent = getPercentageForCategory(category.id) / 100
                              totalDeductibleAmount += category.amount * categoryPercent
                              totalDeductibleGst += category.gst * categoryPercent
                            })

                            return categories.length > 0 ? (
                              <>
                                {categories.map((category, idx) => {
                                  const categoryPercent = getPercentageForCategory(category.id)
                                  const categoryPercentDecimal = categoryPercent / 100
                                  const deductibleAmount = category.amount * categoryPercentDecimal
                                  const deductibleGst = category.gst * categoryPercentDecimal

                                  return (
                                    <tr key={category.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}>
                                      <td className="px-4 py-2 text-sm font-medium text-blue-600">
                                        {category.name}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                        {formatCurrency(category.amount)}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                        {percentageMode === 'individual' ? (
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={categoryPercent}
                                            onChange={(e) => handleCategoryPercentageChange(category.id, parseInt(e.target.value) || 0)}
                                            className="w-16 px-2 py-1 border border-gray-300 rounded text-right"
                                          />
                                        ) : (
                                          `${categoryPercent}%`
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                        {formatCurrency(deductibleAmount)}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                        {formatCurrency(deductibleGst)}
                                      </td>
                                    </tr>
                                  )
                                })}
                                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                                  <td className="px-4 py-2 text-sm">
                                    Total
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                    {formatCurrency(totalSubtotal)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                    {percentageMode === 'all' ? `${businessUsePercentage}%` : 'Varies'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                    {formatCurrency(totalDeductibleAmount)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                    {formatCurrency(totalDeductibleGst)}
                                  </td>
                                </tr>
                                <tr className="bg-gray-100">
                                  <td className="px-4 py-2 text-sm font-medium text-gray-700">
                                    Business Use Percentage
                                  </td>
                                  <td></td>
                                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                    {businessUsePercentage}%
                                  </td>
                                  <td></td>
                                </tr>
                                <tr className="bg-blue-100 border-b-2 border-blue-300 hover:bg-blue-200">
                                  <td className="px-4 py-2 text-sm font-bold text-blue-900">
                                    Motor Vehicle Expenses (T2125 Line)
                                  </td>
                                  <td></td>
                                  <td></td>
                                  <td className="px-4 py-2 text-sm font-bold text-blue-900 text-right">
                                    {formatCurrency(totalDeductibleAmount)}
                                  </td>
                                  <td></td>
                                </tr>
                                <tr className="bg-blue-100 border-b-2 border-blue-300 hover:bg-blue-200">
                                  <td className="px-4 py-2 text-sm font-bold text-blue-900">
                                    GST - Input Tax Credit
                                  </td>
                                  <td></td>
                                  <td></td>
                                  <td></td>
                                  <td className="px-4 py-2 text-sm font-bold text-blue-900 text-right">
                                    {formatCurrency(totalDeductibleGst)}
                                  </td>
                                </tr>
                              </>
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
