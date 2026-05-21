'use client'

import { useEffect, useState } from 'react'
import { Client } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { getAccessToken } from '@/lib/auth'

interface BalanceSheetData {
  month: string
  clientId: string
  assets: Array<{ name: string; code: string; balance: number; type: string }>
  liabilities: Array<{ name: string; code: string; balance: number; type: string }>
  equity: Array<{ name: string; code: string; balance: number; type: string }>
  totals: {
    assets: number
    liabilities: number
    equity: number
    totalLiabilitiesEquity: number
  }
}

export default function BalanceSheetPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getAccessToken()
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    fetch('/api/clients', { headers })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch clients')
        return r.json()
      })
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching clients:', err)
        setClients([])
      })
  }, [])

  async function fetchBalanceSheet() {
    setLoading(true)
    setError('')

    try {
      const url = selectedClient
        ? `/api/reports/balance-sheet?clientId=${selectedClient}&month=${selectedMonth}`
        : `/api/reports/balance-sheet?month=${selectedMonth}`

      const token = getAccessToken()
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(url, { headers })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch balance sheet')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Error fetching balance sheet')
    } finally {
      setLoading(false)
    }
  }

  const isBalanced = data && data.totals.assets === data.totals.totalLiabilitiesEquity

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Balance Sheet</h1>
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

              {/* Month Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <button
                onClick={fetchBalanceSheet}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium text-sm transition"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
            </div>
          </div>

          {/* Right Content - Balance Sheet Report */}
          <div className="lg:col-span-3">
            {data && (
              <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h2 className="text-2xl font-bold">
              {clients.find(c => c.id.toString() === data.clientId)?.name}
            </h2>
            <p className="text-gray-600">Balance Sheet as of {new Date(data.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>

          {/* Assets Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-blue-900 mb-4">ASSETS</h3>
            <table className="w-full border-collapse">
              <tbody>
                {data.assets.length > 0 ? (
                  data.assets.map((asset, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 text-gray-800">{asset.name}</td>
                      <td className="py-2 text-right text-gray-600 text-sm">{asset.code}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(asset.balance)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-2 text-gray-400 text-center">No asset accounts</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="border-t-2 border-gray-800 mt-4 pt-2 flex justify-between items-center">
              <span className="font-bold">Total Assets</span>
              <span className="font-bold text-lg">{formatCurrency(data.totals.assets)}</span>
            </div>
          </div>

          {/* Liabilities Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-red-900 mb-4">LIABILITIES</h3>
            <table className="w-full border-collapse">
              <tbody>
                {data.liabilities.length > 0 ? (
                  data.liabilities.map((liability, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 text-gray-800">{liability.name}</td>
                      <td className="py-2 text-right text-gray-600 text-sm">{liability.code}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(liability.balance)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-2 text-gray-400 text-center">No liability accounts</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="border-t-2 border-gray-800 mt-4 pt-2 flex justify-between items-center">
              <span className="font-bold">Total Liabilities</span>
              <span className="font-bold text-lg">{formatCurrency(data.totals.liabilities)}</span>
            </div>
          </div>

          {/* Equity Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-green-900 mb-4">EQUITY</h3>
            <table className="w-full border-collapse">
              <tbody>
                {data.equity.length > 0 ? (
                  data.equity.map((eq, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 text-gray-800">{eq.name}</td>
                      <td className="py-2 text-right text-gray-600 text-sm">{eq.code}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(eq.balance)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-2 text-gray-400 text-center">No equity accounts</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="border-t-2 border-gray-800 mt-4 pt-2 flex justify-between items-center">
              <span className="font-bold">Total Equity</span>
              <span className="font-bold text-lg">{formatCurrency(data.totals.equity)}</span>
            </div>
          </div>

          {/* Summary */}
          <div className={`rounded-lg shadow-md p-6 text-center ${isBalanced ? 'bg-green-50' : 'bg-amber-50'}`}>
            <div className="space-y-2">
              <div className="flex justify-between text-lg">
                <span>Total Assets:</span>
                <span className="font-bold">{formatCurrency(data.totals.assets)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Total Liabilities + Equity:</span>
                <span className="font-bold">{formatCurrency(data.totals.totalLiabilitiesEquity)}</span>
              </div>
              <div className={`text-lg font-bold mt-4 ${isBalanced ? 'text-green-700' : 'text-amber-700'}`}>
                {isBalanced ? '✓ Balance Sheet is Balanced' : '⚠ Balance Sheet is NOT Balanced'}
              </div>
            </div>
          </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
