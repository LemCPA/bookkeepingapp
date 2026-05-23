'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChartOfAccount } from '@/lib/types'
import { createAuthenticatedFetch } from '@/lib/auth'

export default function NewTransactionPage() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [defaultGstRate, setDefaultGstRate] = useState('0')

  const [formData, setFormData] = useState({
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    gstRate: '0',
    pstRate: '0-ab',
    customPstRate: '',
    description: '',
    type: 'RECEIPT',
    reference: '',
    taxIncluded: false, // true = amount includes tax, false = amount is before tax
  })

  useEffect(() => {
    // Set type from query parameter
    const queryType = searchParams.get('type')
    if (queryType && ['RECEIPT', 'INVOICE', 'ADJUSTMENT'].includes(queryType)) {
      setFormData(prev => ({ ...prev, type: queryType }))
    }
  }, [searchParams])

  useEffect(() => {
    const authenticatedFetch = createAuthenticatedFetch()

    // Load default GST/HST rate
    authenticatedFetch('/api/user/settings').then(r => {
      if (r.ok) return r.json()
      return Promise.resolve({})
    }).then(data => {
      const rate = data.default_gst_hst_rate?.toString() || '0'
      setDefaultGstRate(rate)
      setFormData(prev => ({ ...prev, gstRate: rate }))
    }).catch(() => {
      setDefaultGstRate('0')
    })

    // Load accounts
    authenticatedFetch('/api/chart-of-accounts').then(r => {
      if (!r.ok) throw new Error('Failed to fetch accounts')
      return r.json()
    }).then(data => setAccounts(Array.isArray(data) ? data : [])).catch(() => setAccounts([])).finally(() => setLoading(false))
  }, [])

  function calculateTaxAmount(amount: number, gstRate: number, pstRate: number, taxIncluded: boolean): { baseAmount: number; taxAmount: number } {
    const totalRate = gstRate + pstRate
    if (taxIncluded) {
      // Amount includes tax, need to back out the tax
      const baseAmount = amount / (1 + totalRate / 100)
      const taxAmount = amount - baseAmount
      return { baseAmount, taxAmount }
    } else {
      // Amount is before tax, tax is added on top
      const baseAmount = amount
      const taxAmount = amount * (totalRate / 100)
      return { baseAmount, taxAmount }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const amount = parseFloat(formData.amount)
      const gstRate = parseFloat(formData.gstRate)

      let pstRate = 0
      if (formData.pstRate === 'custom') {
        pstRate = parseFloat(formData.customPstRate)
      } else if (formData.pstRate !== '0') {
        const rateStr = formData.pstRate.split('-')[0]
        pstRate = parseFloat(rateStr)
      }

      const totalRate = gstRate + pstRate
      const { baseAmount, taxAmount } = calculateTaxAmount(amount, gstRate, pstRate, formData.taxIncluded)

      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: parseInt(formData.accountId),
          transaction_date: formData.date,
          amount: baseAmount, // Use the base amount (before tax)
          gst_hst_rate: totalRate,
          gst_hst_amount: taxAmount,
          description: formData.description,
          type: formData.type,
          reference_number: formData.reference,
        }),
      })

      if (!response.ok) throw new Error('Failed to create transaction')

      const transaction = await response.json()

      // Upload file if provided
      if (file) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('transactionId', transaction.id.toString())

        await authenticatedFetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })
      }

      // Reset form and redirect
      setFormData({
        accountId: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        gstRate: defaultGstRate,
        pstRate: '0-ab',
        customPstRate: '',
        description: '',
        type: 'RECEIPT',
        reference: '',
        taxIncluded: false,
      })
      setFile(null)
      window.location.href = '/transactions'
    } catch (error) {
      console.error('Error creating transaction:', error)
      alert('Error creating transaction')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">New Transaction</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="RECEIPT">Receipt</option>
            <option value="INVOICE">Invoice</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              required
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Amount Type</label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <input
                type="radio"
                name="taxType"
                checked={!formData.taxIncluded}
                onChange={() => setFormData({ ...formData, taxIncluded: false })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-3 font-medium text-gray-900">Subtotal (tax added on top)</span>
              <span className="ml-auto text-sm text-gray-500">e.g., $100 + $13 tax = $113</span>
            </label>
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <input
                type="radio"
                name="taxType"
                checked={formData.taxIncluded}
                onChange={() => setFormData({ ...formData, taxIncluded: true })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-3 font-medium text-gray-900">Total (tax already included)</span>
              <span className="ml-auto text-sm text-gray-500">e.g., $113 (includes $13 tax)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST (Federal)</label>
            <select
              value={formData.gstRate}
              onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="0">No GST</option>
              <option value="5">5% GST</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PST/HST/QST (Provincial)</label>
            <select
              value={formData.pstRate}
              onChange={(e) => setFormData({ ...formData, pstRate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="0-ab">No PST/HST (Alberta)</option>
              <option value="6-sk">6% PST (Saskatchewan)</option>
              <option value="7-bc">7% PST (British Columbia)</option>
              <option value="8-mb">8% PST (Manitoba)</option>
              <option value="8-on">8% HST (Ontario)</option>
              <option value="10-pe">10% HST (Prince Edward Island)</option>
              <option value="10-ns">10% HST (Nova Scotia)</option>
              <option value="10-nb">10% HST (New Brunswick)</option>
              <option value="10-nl">10% HST (Newfoundland & Labrador)</option>
              <option value="9.975-qc">9.975% QST (Quebec - in addition to GST)</option>
              <option value="custom">Custom PST/HST/QST Rate</option>
            </select>
          </div>
        </div>

        {formData.pstRate === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom PST/HST/QST Rate (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.customPstRate}
              onChange={(e) => setFormData({ ...formData, customPstRate: e.target.value })}
              placeholder="Enter custom provincial tax rate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {(formData.gstRate || formData.pstRate) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Total Tax Rate: </span>
              {(() => {
                const gst = parseFloat(formData.gstRate)
                let pst = 0
                if (formData.pstRate === 'custom') {
                  pst = parseFloat(formData.customPstRate) || 0
                } else if (formData.pstRate !== '0') {
                  const rateStr = formData.pstRate.split('-')[0]
                  pst = parseFloat(rateStr)
                }
                return (gst + pst).toFixed(3)
              })()}%
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
          <select
            required
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an account</option>
            {accounts
              .filter(account => {
                // Filter accounts based on transaction type
                if (formData.type === 'INVOICE') return account.type === 'INCOME'
                if (formData.type === 'RECEIPT') return account.type === 'EXPENSE'
                return true // ADJUSTMENT can use any account
              })
              .map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name} ({account.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference #</label>
          <input
            type="text"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Amount Summary */}
        {formData.amount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Amount Summary</p>
            {(() => {
              const amount = parseFloat(formData.amount)
              const gstRate = parseFloat(formData.gstRate)
              let pstRate = 0
              if (formData.pstRate === 'custom') {
                pstRate = parseFloat(formData.customPstRate) || 0
              } else if (formData.pstRate !== '0') {
                const rateStr = formData.pstRate.split('-')[0]
                pstRate = parseFloat(rateStr)
              }
              const totalRate = gstRate + pstRate
              const { baseAmount, taxAmount } = calculateTaxAmount(amount, gstRate, pstRate, formData.taxIncluded)
              const total = baseAmount + taxAmount
              return (
                <div className="text-sm text-blue-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal (before tax):</span>
                    <span className="font-medium">${baseAmount.toFixed(2)}</span>
                  </div>
                  {totalRate > 0 && (
                    <div className="flex justify-between">
                      <span>Tax ({totalRate.toFixed(3)}%):</span>
                      <span className="font-medium">${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 pt-1 flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload Document (PDF, JPG, PNG)</label>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Transaction
          </button>
          <a
            href="/transactions"
            className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 font-medium text-center"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
