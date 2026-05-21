'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Client } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface AgingBucket {
  range: string
  totalAmount: number
  transactionCount: number
}

interface ARAgingRow {
  customerId?: number
  customerName: string
  totalUnpaid: number
  buckets: AgingBucket[]
  lastTransactionDate: string
}

interface ARAgingResponse {
  asOfDate: string
  clientId: string
  summary: {
    totalCustomers: number
    totalUnpaid: number
    bucketTotals: { [key: string]: { totalAmount: number; transactionCount: number } }
  }
  data: ARAgingRow[]
}

export default function ARAgingPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState<ARAgingResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(setClients)
  }, [])

  async function fetchARAgingReport() {
    if (!selectedClient) {
      setError('Please select a client')
      return
    }

    setLoading(true)
    setError('')
    setDetailData(null)
    setSelectedCustomer(null)

    try {
      const response = await fetch(
        `/api/reports/ar-aging?clientId=${selectedClient}&asOfDate=${asOfDate}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch A/R aging report')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Error fetching A/R aging report')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCustomerDetail(customerName: string) {
    if (!selectedClient) return

    try {
      const response = await fetch(
        `/api/reports/ar-aging?clientId=${selectedClient}&asOfDate=${asOfDate}&customerName=${encodeURIComponent(customerName)}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch customer details')
      }

      const result = await response.json()
      setDetailData(result)
      setSelectedCustomer(customerName)
    } catch (err: any) {
      setError(err.message || 'Error fetching customer details')
    }
  }

  const agingBucketOrder = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days']

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Accounts Receivable Aging</h1>
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

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">As of Date</label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <button
                onClick={fetchARAgingReport}
                disabled={loading || !selectedClient}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium text-sm transition"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
            </div>
          </div>

          {/* Right Content - A/R Aging Report */}
          <div className="lg:col-span-3">
            {selectedCustomer && detailData ? (
              // Customer Detail View
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{detailData.customerName}</h2>
                      <p className="text-gray-600 mt-1">Invoice Detail</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null)
                        setDetailData(null)
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Back to Summary
                    </button>
                  </div>

                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-800 bg-gray-50">
                        <th className="text-left py-2 px-3 font-bold">Invoice #</th>
                        <th className="text-left py-2 px-3 font-bold">Date</th>
                        <th className="text-left py-2 px-3 font-bold">Due Date</th>
                        <th className="text-right py-2 px-3 font-bold">Amount</th>
                        <th className="text-right py-2 px-3 font-bold">Days Overdue</th>
                        <th className="text-left py-2 px-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.transactions.map((txn: any) => (
                        <tr key={txn.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-900">#{txn.id}</td>
                          <td className="py-2 px-3 text-gray-700">{new Date(txn.transaction_date).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-gray-700">{new Date(txn.due_date).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-900">{formatCurrency(txn.amount)}</td>
                          <td className={`py-2 px-3 text-right font-semibold ${
                            txn.daysOverdue > 90 ? 'text-red-600' :
                            txn.daysOverdue > 60 ? 'text-orange-600' :
                            txn.daysOverdue > 30 ? 'text-yellow-600' :
                            txn.daysOverdue > 0 ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {txn.daysOverdue}
                          </td>
                          <td className="py-2 px-3 text-gray-700">{txn.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="border-t-2 border-gray-800 mt-4 pt-4 flex justify-between items-center">
                    <span className="font-bold">Total Unpaid:</span>
                    <span className="font-bold text-lg text-gray-900">{formatCurrency(detailData.totalAmount)}</span>
                  </div>
                </div>
              </div>
            ) : data ? (
              // Summary View
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg shadow p-3">
                    <p className="text-gray-600 text-xs font-medium">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.totalCustomers}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-3">
                    <p className="text-gray-600 text-xs font-medium">Total Unpaid</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(data.summary.totalUnpaid)}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-3">
                    <p className="text-gray-600 text-xs font-medium">Current</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {formatCurrency(data.summary.bucketTotals['Current']?.totalAmount || 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-3">
                    <p className="text-gray-600 text-xs font-medium">Over 90 Days</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {formatCurrency(data.summary.bucketTotals['90+ Days']?.totalAmount || 0)}
                    </p>
                  </div>
                </div>

                {/* A/R Aging Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-800 bg-gray-50">
                        <th className="text-left py-2 px-3 font-bold text-gray-800 min-w-40">Customer</th>
                        {agingBucketOrder.map((bucket) => (
                          <th key={bucket} className="text-right py-2 px-3 font-bold text-gray-800">
                            {bucket}
                          </th>
                        ))}
                        <th className="text-right py-2 px-3 font-bold text-gray-800 border-l-2 border-gray-300">Total Unpaid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.data.map((row) => (
                        <tr
                          key={row.customerName}
                          className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                          onClick={() => fetchCustomerDetail(row.customerName)}
                        >
                          <td className="py-2 px-3 font-medium text-gray-900 hover:text-blue-600">{row.customerName}</td>
                          {agingBucketOrder.map((bucketRange) => {
                            const bucket = row.buckets.find(b => b.range === bucketRange)
                            const amount = bucket?.totalAmount || 0
                            const colorClass =
                              bucketRange === 'Current' ? 'text-green-600' :
                              bucketRange === '90+ Days' ? 'text-red-600' :
                              bucketRange === '61-90 Days' ? 'text-red-600' :
                              bucketRange === '31-60 Days' ? 'text-orange-600' :
                              'text-amber-600'
                            return (
                              <td key={bucketRange} className={`py-2 px-3 text-right font-semibold ${colorClass}`}>
                                {formatCurrency(amount)}
                              </td>
                            )
                          })}
                          <td className="py-2 px-3 text-right font-bold text-gray-900 border-l-2 border-gray-300">
                            {formatCurrency(row.totalUnpaid)}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-blue-50 border-t-2 border-gray-800 font-bold">
                        <td className="py-2 px-3 text-gray-900">Total</td>
                        {agingBucketOrder.map((bucket) => (
                          <td key={bucket} className="py-2 px-3 text-right text-gray-900">
                            {formatCurrency(data.summary.bucketTotals[bucket]?.totalAmount || 0)}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right text-gray-900 border-l-2 border-gray-300">
                          {formatCurrency(data.summary.totalUnpaid)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bucket Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {agingBucketOrder.map((bucket) => (
                    <div key={bucket} className="bg-white rounded-lg shadow p-3">
                      <p className="text-gray-600 text-xs font-medium">{bucket}</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {formatCurrency(data.summary.bucketTotals[bucket]?.totalAmount || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {data.summary.bucketTotals[bucket]?.transactionCount || 0} invoice(s)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
