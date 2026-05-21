'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface GstFilingData {
  clientName: string
  gstNumber: string
  month: string
  gstCollected: number
  gstPaid: number
  netGst: number
  owingOrRefundable: string
  amount: number
}

export default function GstFilingContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')
  const [filingData, setFilingData] = useState<GstFilingData | null>(null)
  const [startMonth, setStartMonth] = useState<string>('')
  const [endMonth, setEndMonth] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    setStartMonth(currentMonth)
    setEndMonth(currentMonth)
  }, [])

  useEffect(() => {
    if (startMonth && endMonth && clientId) {
      fetchGstData()
    }
  }, [startMonth, endMonth, clientId])

  async function fetchGstData() {
    try {
      setLoading(true)
      const url = `/api/reports/gst-filing?clientId=${clientId}&startMonth=${startMonth}&endMonth=${endMonth}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setFilingData(data)
      }
    } catch (error) {
      console.error('Error fetching GST filing data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !filingData) {
    return <div className="text-center py-8">Loading GST filing data...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">GST/HST Filing</h1>
        <div className="text-gray-600 space-y-1">
          <p><strong>Client:</strong> {filingData.clientName}</p>
          <p><strong>GST/HST Number:</strong> {filingData.gstNumber || 'Not provided'}</p>
          <p><strong>Period:</strong> {filingData.month}</p>
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Period</label>
          <input
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Period</label>
          <input
            type="month"
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GST Collected */}
        <div className="bg-blue-50 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">GST/HST Collected</h2>
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {formatCurrency(filingData.gstCollected)}
          </div>
          <p className="text-sm text-blue-700">
            Tax collected on invoices (output tax)
          </p>
        </div>

        {/* GST Paid */}
        <div className="bg-green-50 rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h2 className="text-lg font-semibold text-green-900 mb-4">GST/HST Paid</h2>
          <div className="text-4xl font-bold text-green-600 mb-2">
            {formatCurrency(filingData.gstPaid)}
          </div>
          <p className="text-sm text-green-700">
            Input tax credits on expenses & receipts
          </p>
        </div>
      </div>

      {/* Net GST Owing or Refundable */}
      <div
        className={`rounded-lg shadow-md p-8 ${
          filingData.netGst > 0
            ? 'bg-red-50 border-l-4 border-red-500'
            : 'bg-purple-50 border-l-4 border-purple-500'
        }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <h2
              className={`text-2xl font-semibold mb-4 ${
                filingData.netGst > 0 ? 'text-red-900' : 'text-purple-900'
              }`}
            >
              {filingData.owingOrRefundable === 'Owing'
                ? 'GST/HST Owing to CRA'
                : 'GST/HST Refund Due'}
            </h2>
            <div
              className={`text-5xl font-bold mb-2 ${
                filingData.netGst > 0 ? 'text-red-600' : 'text-purple-600'
              }`}
            >
              {formatCurrency(filingData.amount)}
            </div>
          </div>
          <div className="text-right text-sm">
            {filingData.netGst > 0 ? (
              <div className="bg-red-100 text-red-800 px-4 py-2 rounded font-medium">
                PAYMENT DUE
              </div>
            ) : (
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded font-medium">
                REFUND ELIGIBLE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calculation Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Calculation Breakdown</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-gray-700 pb-2 border-b">
            <span>GST/HST Collected (Output Tax)</span>
            <span className="font-medium">{formatCurrency(filingData.gstCollected)}</span>
          </div>
          <div className="flex justify-between text-gray-700 pb-2 border-b">
            <span>Less: GST/HST Paid (Input Tax Credits)</span>
            <span className="font-medium">({formatCurrency(filingData.gstPaid)})</span>
          </div>
          <div className="flex justify-between text-lg font-bold bg-gray-50 p-3 rounded">
            <span>Net GST/HST Position</span>
            <span
              className={filingData.netGst > 0 ? 'text-red-600' : 'text-green-600'}
            >
              {filingData.netGst > 0 ? '+' : '-'}
              {formatCurrency(filingData.amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Filing Instructions */}
      <div className="bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-400">
        <h3 className="font-semibold text-yellow-900 mb-2">Important Notes</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• This report is for reference only. Please verify with official CRA records.</li>
          <li>• Filing deadlines and remittance due dates depend on your filing frequency.</li>
          <li>• Consult with a tax professional for accurate GST/HST compliance.</li>
          <li>• Keep all supporting documentation (invoices, receipts) for audit purposes.</li>
        </ul>
      </div>
    </div>
  )
}
