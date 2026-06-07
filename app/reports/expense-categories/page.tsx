'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createAuthenticatedFetch } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { canAccessReport } from '@/lib/report-access'

// Format currency without decimals and no dollar sign (for monthly columns)
const formatMonthAmount = (value: number) => {
  const formatted = formatCurrency(value)
  return formatted.replace(/\$/, '').replace(/\.\d+/, '').trim()
}

// Format currency without decimals but with dollar sign (for totals)
const formatTotalAmount = (value: number) => {
  const formatted = formatCurrency(value)
  return formatted.replace(/\.\d+/, '')
}

interface ExpenseCategory {
  id: number
  type: string
  name: string
  code: string
  monthlyBalances: { [month: string]: number }
  total: number
}

interface ExpenseCategoriesData {
  months: string[]
  categories: ExpenseCategory[]
  monthlyTotals: { [month: string]: number }
  grandTotal: number
}

export default function ExpenseCategoriesPage() {
  const currentYear = new Date().getFullYear()

  const [year, setYear] = useState<string>(() => {
    try {
      return localStorage.getItem('expenseCategoriesYear') || currentYear.toString()
    } catch {
      return currentYear.toString()
    }
  })

  const [startMonth, setStartMonth] = useState<string>(() => {
    try {
      return localStorage.getItem('expenseCategoriesStartMonth') || `${currentYear}-01`
    } catch {
      return `${currentYear}-01`
    }
  })

  const [endMonth, setEndMonth] = useState<string>(() => {
    try {
      return localStorage.getItem('expenseCategoriesEndMonth') || `${currentYear}-12`
    } catch {
      return `${currentYear}-12`
    }
  })

  const [data, setData] = useState<ExpenseCategoriesData | null>(null)
  const [allCategories, setAllCategories] = useState<ExpenseCategory[]>([])

  const [selectedCategories, setSelectedCategories] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('expenseCategoriesSelected')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
          setHasAccess(canAccessReport('expense-categories', data.plan || 'free'))
        }
      } catch (err) {
        console.error('Failed to check subscription:', err)
        setHasAccess(false)
      }
    }
    checkAccess()
  }, [])

  // Save year to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('expenseCategoriesYear', year)
    } catch (error) {
      console.error('Failed to save year to localStorage:', error)
    }
  }, [year])

  // Save start/end months to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('expenseCategoriesStartMonth', startMonth)
      localStorage.setItem('expenseCategoriesEndMonth', endMonth)
    } catch (error) {
      console.error('Failed to save months to localStorage:', error)
    }
  }, [startMonth, endMonth])

  // Save selected categories to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('expenseCategoriesSelected', JSON.stringify(selectedCategories))
    } catch (error) {
      console.error('Failed to save selected categories to localStorage:', error)
    }
  }, [selectedCategories])

  // Load categories
  useEffect(() => {
    loadAvailableCategories()
  }, [])

  // Fetch report when date range or selected categories change
  useEffect(() => {
    fetchReport()
  }, [startMonth, endMonth, selectedCategories])

  async function loadAvailableCategories() {
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch('/api/chart-of-accounts?type=EXPENSE')

      if (!response.ok) {
        throw new Error('Failed to load expense categories')
      }

      const result = await response.json()
      setAllCategories(result)
    } catch (err: any) {
      console.error('Error loading categories:', err)
    }
  }

  async function fetchReport() {
    if (selectedCategories.length === 0) {
      setData(null)
      return
    }

    setLoading(true)
    setError('')

    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const categoriesParam = selectedCategories.join(',')
      const response = await authenticatedFetch(
        `/api/reports/expense-categories?startMonth=${startMonth}&endMonth=${endMonth}&categories=${categoriesParam}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch expense report')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Error fetching expense report')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSelectAll = () => {
    if (selectedCategories.length === allCategories.length) {
      setSelectedCategories([])
    } else {
      setSelectedCategories(allCategories.map(c => c.id))
    }
  }

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  // Show upgrade prompt if user doesn't have access
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h1>
            <p className="text-gray-600 mb-6">Expense Categories Report is available on Starter and Growth plans.</p>
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
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-6 mt-6">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Expense Categories by Month</h1>
          <p className="text-gray-600 mt-2">Track your spending across different expense categories over time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-[160px] space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Report Options</h2>
              </div>

              {/* Year Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value)
                    setStartMonth(`${e.target.value}-01`)
                    setEndMonth(`${e.target.value}-12`)
                  }}
                  min="2020"
                  max="2099"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Start Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Month</label>
                <select
                  value={startMonth.split('-')[1]}
                  onChange={(e) => setStartMonth(`${year}-${e.target.value}`)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>

              {/* End Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Month</label>
                <select
                  value={endMonth.split('-')[1]}
                  onChange={(e) => setEndMonth(`${year}-${e.target.value}`)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>

              {/* Category Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Expense Categories
                  </label>
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedCategories.length === allCategories.length ? 'Clear' : 'All'}
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {allCategories.length === 0 ? (
                    <p className="text-sm text-gray-500">No expense categories found</p>
                  ) : (
                    allCategories.map(category => (
                      <label key={category.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="w-4 h-4 border-gray-300 rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700 flex-1 truncate">
                          {category.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Right Content - Expense Report */}
          <div className="lg:col-span-3">
            {data && (
              <div className="space-y-3">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-4 text-center">
                  <h2 className="text-lg font-bold mb-1">Expenses by Category</h2>
                  <p className="text-sm text-gray-600">
                    {startMonth} to {endMonth}
                  </p>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-md p-4 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-800">
                        <th className="text-left py-1 px-2 font-bold text-gray-800">Category</th>
                        {data.months.map(month => (
                          <th key={month} className="text-right py-1 px-2 font-bold text-gray-800 whitespace-nowrap">
                            {getMonthName(month)}
                          </th>
                        ))}
                        <th className="text-right py-1 px-2 font-bold text-gray-800 border-l-2 border-gray-400">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.categories.length === 0 ? (
                        <tr>
                          <td colSpan={data.months.length + 2} className="py-4 px-2 text-center text-gray-500">
                            No data available for selected categories
                          </td>
                        </tr>
                      ) : (
                        <>
                          {data.categories.map((category, idx) => (
                            <tr key={category.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}>
                              <td className="py-1 px-2 text-gray-800 font-medium">
                                {category.name}
                              </td>
                              {data.months.map(month => (
                                <td key={month} className="py-1 px-2 text-right text-gray-700">
                                  {formatMonthAmount(category.monthlyBalances[month] || 0)}
                                </td>
                              ))}
                              <td className="py-1 px-2 text-right font-semibold text-gray-900 border-l-2 border-gray-400">
                                {formatTotalAmount(category.total)}
                              </td>
                            </tr>
                          ))}

                          {/* Monthly Totals Row */}
                          <tr className="bg-blue-50 font-bold text-blue-900 border-t-2 border-gray-800">
                            <td className="py-3 px-2">Monthly Total</td>
                            {data.months.map(month => (
                              <td key={month} className="py-3 px-2 text-right">
                                {formatMonthAmount(data.monthlyTotals[month] || 0)}
                              </td>
                            ))}
                            <td className="py-3 px-2 text-right border-l-2 border-gray-400">
                              {formatTotalAmount(data.grandTotal)}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!data && !loading && selectedCategories.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                Select at least one expense category to view the report
              </div>
            )}

            {!data && !loading && selectedCategories.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                Select date range and generate report
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                Loading expense categories report...
              </div>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="border-t border-gray-200 mt-12 py-6 text-center text-sm text-gray-600">
          <p>
            <a href="/terms" className="hover:text-blue-600 font-medium">
              Terms of Use
            </a>
            {' | '}
            <a href="/disclaimer" className="hover:text-blue-600 font-medium">
              Disclaimer
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
