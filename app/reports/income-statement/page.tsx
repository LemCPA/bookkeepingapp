'use client'

import React, { useEffect, useState } from 'react'
import { createAuthenticatedFetch } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'

// Format currency without decimals
const formatCurrencyNoDecimals = (value: number, includeSymbol: boolean = true) => {
  const formatted = formatCurrency(value)
  const noDecimals = formatted.replace(/\.\d+/, '')
  if (!includeSymbol) {
    return noDecimals.replace(/\$/, '').trim()
  }
  return noDecimals
}

interface IncomeStatementData {
  months: string[]
  accounts: Array<{
    id: number
    type: string
    name: string
    code: string
    parent_account_id?: number
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

  // Initialize year from localStorage, fallback to current year
  const [year, setYear] = useState(() => {
    try {
      const savedYear = localStorage.getItem('incomeStatementYear')
      return savedYear || currentYear.toString()
    } catch {
      return currentYear.toString()
    }
  })

  const [startMonth, setStartMonth] = useState(`${year}-01`)
  const [endMonth, setEndMonth] = useState(`${year}-12`)
  const [data, setData] = useState<IncomeStatementData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gstRegistered, setGstRegistered] = useState(true) // Default to registered
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
    revenue: true,
    expenses: true,
  })

  // Update month range when year changes
  useEffect(() => {
    // Update month range when year changes
    setStartMonth(`${year}-01`)
    setEndMonth(`${year}-12`)
  }, [year])

  // Fetch user's GST registration status
  useEffect(() => {
    const fetchGstStatus = async () => {
      try {
        const authenticatedFetch = createAuthenticatedFetch()
        const response = await authenticatedFetch('/api/user/settings')
        if (response.ok) {
          const settings = await response.json()
          if (settings.gst_registered !== undefined) {
            setGstRegistered(settings.gst_registered)
          }
        }
      } catch (error) {
        console.error('Failed to fetch GST registration status:', error)
      }
    }
    fetchGstStatus()
  }, [])

  // State for business use deductible amounts from reports
  const [homeBusinessUseDeductibleAmount, setHomeBusinessUseDeductibleAmount] = useState(0)
  const [vehicleBusinessUseDeductibleAmount, setVehicleBusinessUseDeductibleAmount] = useState(0)

  useEffect(() => {
    fetchIncomeStatement()
  }, [startMonth, endMonth])

  async function fetchIncomeStatement() {
    setLoading(true)
    setError('')

    try {
      // Get business use percentages from localStorage
      const homePercentage = parseInt(localStorage.getItem('homeBusinessUsePercentage') || '0')
      const vehiclePercentage = parseInt(localStorage.getItem('vehicleBusinessUsePercentage') || '0')

      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch(
        `/api/reports/income-statement?startMonth=${startMonth}&endMonth=${endMonth}&homePercentage=${homePercentage}&vehiclePercentage=${vehiclePercentage}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch income statement')
      }

      const result = await response.json()
      setData(result)

      // Fetch home expenses deductible amount from API (uses Supabase percentages)
      try {
        const homeResponse = await authenticatedFetch(
          `/api/reports/home-expenses?startMonth=${startMonth}&endMonth=${endMonth}`
        )
        if (homeResponse.ok) {
          const homeData = await homeResponse.json()
          // The API already applies the correct deductible amount from Supabase
          setHomeBusinessUseDeductibleAmount(homeData.deductibleAmount || 0)
        }
      } catch (err) {
        console.error('Failed to fetch home expenses data:', err)
      }

      // Fetch vehicle expenses deductible amount from API (uses Supabase percentages)
      try {
        const vehicleResponse = await authenticatedFetch(
          `/api/reports/vehicle-expenses?startMonth=${startMonth}&endMonth=${endMonth}`
        )
        if (vehicleResponse.ok) {
          const vehicleData = await vehicleResponse.json()
          // The API already applies the correct deductible amount from Supabase
          setVehicleBusinessUseDeductibleAmount(vehicleData.deductibleAmount || 0)
        }
      } catch (err) {
        console.error('Failed to fetch vehicle expenses data:', err)
      }
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
          <div className="lg:col-span-1 print:hidden">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-[160px] space-y-3">
              <div className="text-center">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Report Options</h2>
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
                className="w-full bg-blue-600 text-white py-1 px-3 md:py-3 md:px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium text-sm md:text-base transition"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
            </div>
          </div>

          {/* Right Content - Income Statement Report */}
          <div className="lg:col-span-3 print:lg:col-span-4">
            {data && (
              <div className="space-y-3">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-4 flex items-start justify-between">
                  <div className="flex-1 text-center">
                    <h2 className="text-lg font-bold mb-1">Income Statement</h2>
                    <p className="text-sm text-gray-600">
                      For {startMonth} to {endMonth}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Summary of revenues and expenses showing net income for the period
                    </p>
                    {!gstRegistered && (
                      <p className="text-xs text-blue-600 mt-2 font-medium">
                        ℹ️ Not GST-registered — Amounts shown include any applicable tax
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="text-gray-500 hover:text-gray-700 text-lg transition ml-4 flex-shrink-0 p-1"
                    title="Print report"
                  >
                    🖨️
                  </button>
                </div>

                {/* Simple Table */}
                <div className="bg-white rounded-lg shadow-md p-4 overflow-x-auto flex justify-center">
                  <table className="border-collapse text-sm" style={{ maxWidth: '650px', width: '100%' }}>
                    <thead>
                      <tr className="border-b-2 border-gray-800">
                        <th className="text-left py-1 px-3 font-bold text-gray-800">Account</th>
                        <th className="text-right py-1 px-3 font-bold text-gray-800">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Income Section - Collapsible Master Group */}
                      <tr
                        className="bg-green-50 font-bold text-green-900 cursor-pointer hover:bg-green-100"
                        onClick={() =>
                          setExpandedGroups({
                            ...expandedGroups,
                            revenue: !expandedGroups.revenue,
                          })
                        }
                      >
                        <td colSpan={2} className="py-1 px-3">
                          <span className="mr-2">{expandedGroups.revenue ? '▼' : '▶'}</span>
                          REVENUE
                        </td>
                      </tr>

                      {/* All revenue items - shown when master group is expanded */}
                      {expandedGroups.revenue ? (
                        <>
                          {data.accounts
                            .filter((a) => a.type === 'INCOME')
                            .map((account, index) => {
                              const isEvenRow = index % 2 === 0
                              return (
                                <tr key={account.id} className={`border-b border-gray-200 hover:bg-gray-100 ${isEvenRow ? 'bg-white' : 'bg-gray-100'}`}>
                                  <td className="py-1 px-3 text-gray-800">→ {account.name}</td>
                                  <td className="py-1 px-3 text-right font-semibold text-gray-900">
                                    {formatCurrencyNoDecimals(account.total)}
                                  </td>
                                </tr>
                              )
                            })}
                          <tr className="bg-green-100 font-bold text-green-900 border-b-2 border-gray-800">
                            <td className="py-1 px-3">Total Revenue</td>
                            <td className="py-1 px-3 text-right">{formatCurrencyNoDecimals(data.grandTotals.income)}</td>
                          </tr>
                        </>
                      ) : (
                        /* When collapsed, show Total Revenue on its own row */
                        <tr className="bg-green-100 font-bold text-green-900 border-b-2 border-gray-800">
                          <td className="py-1 px-3">Total Revenue</td>
                          <td className="py-1 px-3 text-right">{formatCurrencyNoDecimals(data.grandTotals.income)}</td>
                        </tr>
                      )}

                      {/* Expenses Section - Collapsible Master Group */}
                      {(() => {
                        // Dynamically group by parent_account_id - NO HARDCODING!
                        const expenseAccounts = data.accounts.filter((a) => a.type === 'EXPENSE')

                        // Find all parent accounts (no parent_account_id)
                        const parentAccounts = expenseAccounts.filter((a) => !a.parent_account_id)

                        // Group child accounts by parent_account_id
                        const childAccountsByParent: { [parentId: number]: typeof expenseAccounts } = {}

                        expenseAccounts.forEach((a) => {
                          if (a.parent_account_id) {
                            if (!childAccountsByParent[a.parent_account_id]) {
                              childAccountsByParent[a.parent_account_id] = []
                            }
                            childAccountsByParent[a.parent_account_id].push(a)
                          }
                        })

                        // Separate parent accounts into those with children and those without
                        const parentsWithChildren = parentAccounts.filter(
                          (p) => childAccountsByParent[p.id] && childAccountsByParent[p.id].length > 0
                        )
                        const parentsWithoutChildren = parentAccounts.filter(
                          (p) => !childAccountsByParent[p.id] || childAccountsByParent[p.id].length === 0
                        )

                        // Filter out Motor Vehicle Expenses (9281) from display - it's shown as a separate line via Total Vehicle Expenses
                        const expandableParents = parentsWithChildren.filter(
                          (p) => !p.code || !p.code.startsWith('9281')
                        )

                        // Calculate total expenses
                        const totalExpenses = data.grandTotals.expenses

                        return (
                          <>
                            {/* Master EXPENSES group - collapsible */}
                            <tr
                              className="bg-red-50 font-bold text-red-900 cursor-pointer hover:bg-red-100"
                              onClick={() =>
                                setExpandedGroups({
                                  ...expandedGroups,
                                  expenses: !expandedGroups.expenses,
                                })
                              }
                            >
                              <td colSpan={2} className="py-1 px-3">
                                <span className="mr-2">{expandedGroups.expenses ? '▼' : '▶'}</span>
                                EXPENSES
                              </td>
                            </tr>

                            {/* All expense items - shown when master group is expanded */}
                            {expandedGroups.expenses ? (
                              <>
                                {/* Parent accounts without children - display flat first */}
                                {parentsWithoutChildren.map((account, index) => {
                                  // Apply special styling for Motor Vehicle Expenses
                                  const isVehicleExpenses = account.code === 'MOTOR'
                                  const isEvenRow = index % 2 === 0
                                  const rowClass = isVehicleExpenses
                                    ? 'bg-blue-100 font-bold text-blue-900 border-b border-gray-200 hover:bg-blue-200'
                                    : `border-b border-gray-200 hover:bg-gray-100 ${isEvenRow ? 'bg-white' : 'bg-gray-100'}`
                                  const tdClass = isVehicleExpenses
                                    ? 'text-blue-900'
                                    : 'text-gray-800'

                                  return (
                                    <tr key={account.id} className={rowClass}>
                                      <td className={`py-2 px-2 ${tdClass}`}>→ {account.name}</td>
                                      <td className={`py-2 px-2 text-right font-bold ${tdClass}`}>
                                        {formatCurrencyNoDecimals(account.total)}
                                      </td>
                                    </tr>
                                  )
                                })}

                                {/* Expandable parents - rendered as nested collapsible groups */}
                                {expandableParents.map((parentAccount, parentIndex) => {
                                  const children = childAccountsByParent[parentAccount.id] || []
                                  const groupKey = `group-${parentAccount.id}`

                                  // Check if this is a business-use expense that should be simplified
                                  const isHomeExpenses = parentAccount.code && parentAccount.code.startsWith('9945')
                                  const isVehicleExpenses = parentAccount.code === 'MOTOR'

                                  // For home and vehicle expenses, show as single line with deductible amount from API
                                  if (isHomeExpenses) {
                                    return (
                                      <tr key={parentAccount.id} className="bg-blue-100 font-bold text-blue-900 border-b-2 border-blue-300 hover:bg-blue-200">
                                        <td className="py-1 px-3">→ Business-Use-of-Home Expenses</td>
                                        <td className="py-1 px-3 text-right font-bold">
                                          {formatCurrencyNoDecimals(homeBusinessUseDeductibleAmount)}
                                        </td>
                                      </tr>
                                    )
                                  }

                                  if (isVehicleExpenses) {
                                    return (
                                      <tr key={parentAccount.id} className="bg-blue-100 font-bold text-blue-900 border-b-2 border-blue-300 hover:bg-blue-200">
                                        <td className="py-1 px-3">→ Motor Vehicle Expenses</td>
                                        <td className="py-1 px-3 text-right font-bold">
                                          {formatCurrencyNoDecimals(vehicleBusinessUseDeductibleAmount)}
                                        </td>
                                      </tr>
                                    )
                                  }

                                  // For other parent accounts, show as expandable group
                                  const childrenTotal = children.reduce((sum, child) => sum + child.total, 0)
                                  const totalBeforePercentage = childrenTotal > 0 ? childrenTotal : parentAccount.total
                                  const parentTotal = totalBeforePercentage

                                  return (
                                    <React.Fragment key={parentAccount.id}>
                                      <tr
                                        className="bg-blue-50 font-semibold text-blue-900 cursor-pointer hover:bg-blue-100"
                                        onClick={() =>
                                          setExpandedGroups({
                                            ...expandedGroups,
                                            [groupKey]: !expandedGroups[groupKey as keyof typeof expandedGroups],
                                          })
                                        }
                                      >
                                        <td className="py-1 px-3 pl-4">
                                          <span className="mr-2">
                                            {expandedGroups[groupKey as keyof typeof expandedGroups] ? '▼' : '▶'}
                                          </span>
                                          {parentAccount.name}
                                        </td>
                                        <td className="py-1 px-3 text-right font-semibold">
                                          {formatCurrencyNoDecimals(parentTotal)}
                                        </td>
                                      </tr>
                                      {expandedGroups[groupKey as keyof typeof expandedGroups] &&
                                        children.map((child, childIndex) => {
                                          const isEvenChild = childIndex % 2 === 0
                                          const childRowClass = `border-b border-gray-200 hover:bg-gray-100 ${isEvenChild ? 'bg-blue-50' : 'bg-blue-100'}`
                                          return (
                                            <tr key={child.id} className={childRowClass}>
                                              <td className="py-2 px-4 pl-12 text-gray-800">→ {child.name}</td>
                                              <td className="py-1 px-3 text-right text-gray-900">
                                                {formatCurrencyNoDecimals(child.total)}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                    </React.Fragment>
                                  )
                                })}

                                {/* Total Expenses row - only shown when expanded */}
                                <tr className="bg-red-100 font-bold text-red-900 border-b-2 border-gray-800">
                                  <td className="py-1 px-3">Total Expenses</td>
                                  <td className="py-1 px-3 text-right">{formatCurrencyNoDecimals(totalExpenses)}</td>
                                </tr>
                              </>
                            ) : (
                              /* When collapsed, show Total Expenses on its own row */
                              <tr className="bg-red-100 font-bold text-red-900 border-b-2 border-gray-800">
                                <td className="py-1 px-3">Total Expenses</td>
                                <td className="py-1 px-3 text-right">{formatCurrencyNoDecimals(totalExpenses)}</td>
                              </tr>
                            )}
                          </>
                        )
                      })()}

                      {/* Net Income */}
                      <tr
                        className={`font-bold text-lg ${
                          data.grandTotals.netIncome >= 0
                            ? 'bg-green-100 text-green-900'
                            : 'bg-red-100 text-red-900'
                        } border-b-2 border-gray-800`}
                      >
                        <td className="py-3 px-2">Net Income</td>
                        <td className="py-3 px-2 text-right">{formatCurrencyNoDecimals(data.grandTotals.netIncome)}</td>
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
