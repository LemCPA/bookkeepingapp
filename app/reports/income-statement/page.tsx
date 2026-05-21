'use client'

import { useEffect, useState } from 'react'
import { Client, ChartOfAccount } from '@/lib/types'
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
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [startMonth, setStartMonth] = useState(new Date().toISOString().slice(0, 7))
  const [endMonth, setEndMonth] = useState(new Date().toISOString().slice(0, 7))
  const [data, setData] = useState<IncomeStatementData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(setClients)
  }, [])

  async function fetchIncomeStatement() {
    if (!selectedClient) {
      setError('Please select a client')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/reports/income-statement?clientId=${selectedClient}&startMonth=${startMonth}&endMonth=${endMonth}`
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Income Statement</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Report Options</h2>
              </div>

              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedClient('')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedClient === ''
                        ? 'bg-blue-100 text-blue-900 font-medium border border-blue-300'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    All Clients
                  </button>
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClient(client.id.toString())}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        selectedClient === client.id.toString()
                          ? 'bg-blue-100 text-blue-900 font-medium border border-blue-300'
                          : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {client.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Month</label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Month</label>
                <input
                  type="month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <button
                onClick={fetchIncomeStatement}
                disabled={loading || !selectedClient}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium text-sm transition"
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
            <h2 className="text-2xl font-bold">
              {clients.find(c => c.id.toString() === selectedClient)?.name}
            </h2>
            <p className="text-gray-600">
              Income Statement from {new Date(startMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to {new Date(endMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Multi-Month Table */}
          <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="text-left py-2 px-2 font-bold text-gray-800">Account</th>
                  {data.months.map((month) => (
                    <th key={month} className="text-right py-2 px-2 font-bold text-gray-800">
                      {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </th>
                  ))}
                  <th className="text-right py-2 px-2 font-bold text-gray-800 border-l-2 border-gray-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* Income Section */}
                <tr className="bg-green-50 font-bold text-green-900">
                  <td colSpan={data.months.length + 2} className="py-2 px-2">REVENUE</td>
                </tr>
                {data.accounts
                  .filter(a => a.type === 'INCOME')
                  .map((account) => (
                    <tr key={account.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-800">{account.name}</td>
                      {data.months.map((month) => (
                        <td key={month} className="py-2 px-2 text-right text-gray-700">
                          {formatCurrency(account.monthlyBalances[month] || 0)}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-right font-semibold text-gray-900 border-l-2 border-gray-300">
                        {formatCurrency(account.total)}
                      </td>
                    </tr>
                  ))}
                {/* Total Income */}
                <tr className="bg-green-100 font-bold text-green-900 border-b-2 border-gray-800">
                  <td className="py-2 px-2">Total Revenue</td>
                  {data.months.map((month) => (
                    <td key={month} className="py-2 px-2 text-right">
                      {formatCurrency(data.monthlyTotals[month]?.income || 0)}
                    </td>
                  ))}
                  <td className="py-2 px-2 text-right border-l-2 border-gray-300">
                    {formatCurrency(data.grandTotals.income)}
                  </td>
                </tr>

                {/* Expenses Section */}
                <tr className="bg-red-50 font-bold text-red-900">
                  <td colSpan={data.months.length + 2} className="py-2 px-2">EXPENSES</td>
                </tr>
                {data.accounts
                  .filter(a => a.type === 'EXPENSE')
                  .map((account) => (
                    <tr key={account.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-800">{account.name}</td>
                      {data.months.map((month) => (
                        <td key={month} className="py-2 px-2 text-right text-gray-700">
                          {formatCurrency(account.monthlyBalances[month] || 0)}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-right font-semibold text-gray-900 border-l-2 border-gray-300">
                        {formatCurrency(account.total)}
                      </td>
                    </tr>
                  ))}
                {/* Total Expenses */}
                <tr className="bg-red-100 font-bold text-red-900 border-b-2 border-gray-800">
                  <td className="py-2 px-2">Total Expenses</td>
                  {data.months.map((month) => (
                    <td key={month} className="py-2 px-2 text-right">
                      {formatCurrency(data.monthlyTotals[month]?.expenses || 0)}
                    </td>
                  ))}
                  <td className="py-2 px-2 text-right border-l-2 border-gray-300">
                    {formatCurrency(data.grandTotals.expenses)}
                  </td>
                </tr>

                {/* Net Income */}
                <tr className={`font-bold text-lg ${data.grandTotals.netIncome >= 0 ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'} border-b-2 border-gray-800`}>
                  <td className="py-3 px-2">Net Income</td>
                  {data.months.map((month) => (
                    <td key={month} className="py-3 px-2 text-right">
                      {formatCurrency(data.monthlyTotals[month]?.netIncome || 0)}
                    </td>
                  ))}
                  <td className="py-3 px-2 text-right border-l-2 border-gray-300">
                    {formatCurrency(data.grandTotals.netIncome)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
