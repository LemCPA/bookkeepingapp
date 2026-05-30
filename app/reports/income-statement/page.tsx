'use client'

import React, { useEffect, useState } from 'react'
import { createAuthenticatedFetch } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'

interface IncomeStatementData {
  months: string[]
  accounts: Array<{
    id: number
    type: string
    name: string
    code: string
    monthlyBalances: { [month: string]: number }
    total: number
  }>
  monthlyTotals: {
    [month: string]: {
      income: number
      expenses: number
      netIncome: number
    }
  }
  grandTotals: {
    income: number
    expenses: number
    netIncome: number
  }
}

export default function IncomeStatementPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear.toString())
  const [startMonth, setStartMonth] = useState(`${currentYear}-01`)
  const [endMonth, setEndMonth] = useState(`${currentYear}-12`)
  const [data, setData] = useState<IncomeStatementData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchIncomeStatement()
  }, [startMonth, endMonth])

  async function fetchIncomeStatement() {
    setLoading(true)
    setError('')

    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch(
        `/api/reports/income-statement?startMonth=${startMonth}&endMonth=${endMonth}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch income statement')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Error fetching income statement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-6 mt-6">
          <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900">Income Statement</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-[160px] space-y-6">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Report Options</h2>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm md:text-base font-medium text-gray-700 mb-2">Year</label>
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
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-gray-700 mb-2">Start Month</label>
                <select
                  value={startMonth.split('-')[1]}
                  onChange={(e) => setStartMonth(`${year}-${e.target.value}`)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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

              <div>
                <label className="block text-sm md:text-base font-medium text-gray-700 mb-2">End Month</label>
                <select
                  value={endMonth.split('-')[1]}
                  onChange={(e) => setEndMonth(`${year}-${e.target.value}`)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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

              <button
                onClick={fetchIncomeStatement}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-3 md:py-3 md:px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium text-sm md:text-base transition"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
            </div>
          </div>

          {/* Right Content - Income Statement Report */}
          <div className="lg:col-span-3">
            {data && (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <h2 className="text-lg font-bold">Income Statement</h2>
                  <p className="text-sm text-gray-600">
                    For {startMonth} to {endMonth}
                  </p>
                </div>

                {/* Simple Table */}
                <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-800">
                        <th className="text-left py-2 px-2 font-bold text-gray-800">Account</th>
                        <th className="text-right py-2 px-2 font-bold text-gray-800">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Income Section */}
                      <tr className="bg-green-50 font-bold text-green-900">
                        <td colSpan={2} className="py-2 px-2">
                          REVENUE
                        </td>
                      </tr>
                      {data.accounts
                        .filter((a) => a.type === 'INCOME')
                        .map((account) => (
                          <tr key={account.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-2 px-2 text-gray-800">{account.name}</td>
                            <td className="py-2 px-2 text-right font-semibold text-gray-900">
                              {formatCurrency(account.total)}
                            </td>
                          </tr>
                        ))}
                      <tr className="bg-green-100 font-bold text-green-900 border-b-2 border-gray-800">
                        <td className="py-2 px-2">Total Revenue</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(data.grandTotals.income)}</td>
                      </tr>

                      {/* Expenses Section */}
                      <tr className="bg-red-50 font-bold text-red-900">
                        <td colSpan={2} className="py-2 px-2">
                          EXPENSES
                        </td>
                      </tr>
                      {data.accounts
                        .filter((a) => a.type === 'EXPENSE')
                        .map((account) => (
                          <tr key={account.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-2 px-2 text-gray-800">{account.name}</td>
                            <td className="py-2 px-2 text-right font-semibold text-gray-900">
                              {formatCurrency(account.total)}
                            </td>
                          </tr>
                        ))}
                      <tr className="bg-red-100 font-bold text-red-900 border-b-2 border-gray-800">
                        <td className="py-2 px-2">Total Expenses</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(data.grandTotals.expenses)}</td>
                      </tr>

                      {/* Net Income */}
                      <tr
                        className={`font-bold text-lg ${
                          data.grandTotals.netIncome >= 0
                            ? 'bg-green-100 text-green-900'
                            : 'bg-red-100 text-red-900'
                        } border-b-2 border-gray-800`}
                      >
                        <td className="py-3 px-2">Net Income</td>
                        <td className="py-3 px-2 text-right">{formatCurrency(data.grandTotals.netIncome)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!data && !loading && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                Select date range and generate report
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                Loading income statement data...
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
