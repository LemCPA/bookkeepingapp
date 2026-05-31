'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChartOfAccount } from '@/lib/types'
import { createAuthenticatedFetch } from '@/lib/auth'
import { DEFAULT_ACCOUNTS } from '@/lib/default-accounts'

// Fallback accounts from Chart of Accounts (imported from shared source of truth)
const fallbackAccounts: ChartOfAccount[] = DEFAULT_ACCOUNTS.filter(
  (acc) => acc.type === 'EXPENSE'
).map((acc) => ({
  id: parseInt(acc.code),
  code: acc.code,
  name: acc.name,
  type: acc.type as any,
  is_vehicle_expense: acc.code.startsWith('52')
}))

function NewTransactionContent() {
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
    pstRate: '0',
    customPstRate: '',
    description: '',
    type: 'RECEIPT',
    reference: '',
    taxIncluded: false, // true = amount includes tax, false = amount is before tax
    businessUsePercentage: 100,
    invoiceStatus: 'DRAFT', // Only used for INVOICE type: DRAFT, TO_BE_SENT, PAID
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

    // Load accounts with fallback to initialize defaults if empty
    async function loadAccounts() {
      try {
        const r = await authenticatedFetch('/api/chart-of-accounts')
        if (!r.ok) throw new Error('Failed to fetch accounts')
        const data = await r.json()

        console.log('First fetch response:', data)
        console.log('Is array?', Array.isArray(data))
        console.log('Length:', Array.isArray(data) ? data.length : 'N/A')

        // If no accounts, initialize defaults
        if (!Array.isArray(data) || data.length === 0) {
          console.log('No accounts found, initializing defaults...')
          const initR = await authenticatedFetch('/api/chart-of-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initializeDefaults: true })
          })

          console.log('POST response status:', initR.status)
          if (initR.ok) {
            console.log('Defaults initialized, re-fetching accounts...')
            // Re-fetch after initialization
            const retryR = await authenticatedFetch('/api/chart-of-accounts')
            if (retryR.ok) {
              const retryData = await retryR.json()
              console.log('Retry fetch response:', retryData)
              console.log('Setting accounts, length:', Array.isArray(retryData) ? retryData.length : 'not array')
              setAccounts(Array.isArray(retryData) ? retryData : fallbackAccounts)
            } else {
              // Retry failed, use fallback
              setAccounts(fallbackAccounts)
            }
          } else {
            // Initialization failed, use fallback
            setAccounts(fallbackAccounts)
          }
        } else {
          console.log('Accounts already exist, setting to state')
          setAccounts(Array.isArray(data) ? data : fallbackAccounts)
        }
      } catch (err) {
        console.error('Error loading accounts:', err)
        setAccounts(fallbackAccounts)
      } finally {
        setLoading(false)
      }
    }

    loadAccounts()
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
      // Extract numeric GST rate (handle province codes like "5-qc", "15-nb")
      const gstRateStr = formData.gstRate.split('-')[0]
      const gstRate = parseFloat(gstRateStr)

      let pstRate = 0
      if (formData.pstRate === 'custom') {
        pstRate = parseFloat(formData.customPstRate)
      } else if (formData.pstRate !== '0') {
        // Extract numeric PST rate (handle province codes like "7-bc", "10-nb")
        const rateStr = formData.pstRate.split('-')[0]
        pstRate = parseFloat(rateStr)
      }

      const totalRate = gstRate + pstRate
      const { baseAmount, taxAmount } = calculateTaxAmount(amount, gstRate, pstRate, formData.taxIncluded)

      const authenticatedFetch = createAuthenticatedFetch()

      // Build request body
      const requestBody: any = {
        account_id: parseInt(formData.accountId),
        transaction_date: formData.date,
        amount: baseAmount, // Use the base amount (before tax)
        gst_hst_rate: totalRate,
        gst_hst_amount: taxAmount,
        gst_hst_included: formData.taxIncluded,
        description: formData.description,
        type: formData.type,
        reference_number: formData.reference,
      }

      // Add invoice-specific fields if this is an invoice
      if (formData.type === 'INVOICE') {
        if (formData.invoiceStatus === 'TO_BE_SENT') {
          requestBody.sent_date = formData.date // Mark as sent today
        } else if (formData.invoiceStatus === 'PAID') {
          requestBody.sent_date = formData.date // Mark as sent
          requestBody.reconciliation_status = 'PAID' // Mark as paid
        }
        // DRAFT status doesn't need sent_date or reconciliation_status
      }

      const response = await authenticatedFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create transaction')
      }

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
        pstRate: '0',
        customPstRate: '',
        description: '',
        type: 'RECEIPT',
        reference: '',
        taxIncluded: false,
        businessUsePercentage: 100,
        invoiceStatus: 'DRAFT',
      })
      setFile(null)
      window.location.href = '/transactions'
    } catch (error) {
      console.error('Error creating transaction:', error)
      const message = error instanceof Error ? error.message : 'Error creating transaction'
      alert(message)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">New Transaction</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-red-600 mb-1">Type *</label>
          <select
            required
            value={formData.type}
            onChange={(e) => {
              setFormData({ ...formData, type: e.target.value })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="RECEIPT">Receipt</option>
            <option value="INVOICE">Invoice</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Date *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Amount *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">GST/HST Rate</label>
            <select
              value={formData.gstRate}
              onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="0">No GST/HST</option>
              <option value="5">5% GST (AB, BC, MB, SK, NT, NU, YT)</option>
              <option value="5-qc">5% GST (Quebec)</option>
              <option value="13">13% HST (Ontario)</option>
              <option value="15-nb">15% HST (New Brunswick)</option>
              <option value="15-ns">15% HST (Nova Scotia)</option>
              <option value="15-pe">15% HST (Prince Edward Island)</option>
              <option value="15-nl">15% HST (Newfoundland)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PST/HST/QST Rate</label>
            <select
              value={formData.pstRate}
              onChange={(e) => setFormData({ ...formData, pstRate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="0">No PST/HST</option>
              <option value="6-sk">6% PST (Saskatchewan)</option>
              <option value="7-bc">7% PST (British Columbia)</option>
              <option value="8-mb">8% PST (Manitoba)</option>
              <option value="9.975-qc">9.975% QST (Quebec)</option>
              <option value="8-on">8% HST (Ontario)</option>
              <option value="10-nb">10% HST (New Brunswick)</option>
              <option value="10-ns">10% HST (Nova Scotia)</option>
              <option value="10-pe">10% HST (Prince Edward Island)</option>
              <option value="10-nl">10% HST (Newfoundland)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-red-600 mb-1">Account *</label>
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
                return account.type === 'EXPENSE' // ADJUSTMENT uses expense accounts
              })
              .filter(account => {
                // Exclude parent/group accounts (those ending in 0)
                return !account.code.endsWith('0')
              })
              .map((account) => {
                // Strip "Motor Vehicle Expenses - " prefix from vehicle expense account names
                const displayName = account.name.startsWith('Motor Vehicle Expenses - ')
                  ? account.name.replace('Motor Vehicle Expenses - ', '')
                  : account.name
                return (
                  <option key={account.id} value={account.id}>
                    {account.code} - {displayName} ({account.type})
                  </option>
                )
              })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
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

        {formData.type === 'INVOICE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Invoice Status</label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="invoiceStatus"
                  value="DRAFT"
                  checked={formData.invoiceStatus === 'DRAFT'}
                  onChange={(e) => setFormData({ ...formData, invoiceStatus: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3">
                  <span className="font-medium text-gray-900">Draft</span>
                  <span className="ml-2 text-sm text-gray-500">(not yet sent to client)</span>
                </span>
              </label>
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="invoiceStatus"
                  value="TO_BE_SENT"
                  checked={formData.invoiceStatus === 'TO_BE_SENT'}
                  onChange={(e) => setFormData({ ...formData, invoiceStatus: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3">
                  <span className="font-medium text-gray-900">To be Sent</span>
                  <span className="ml-2 text-sm text-gray-500">(ready to send, awaiting payment)</span>
                </span>
              </label>
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="invoiceStatus"
                  value="PAID"
                  checked={formData.invoiceStatus === 'PAID'}
                  onChange={(e) => setFormData({ ...formData, invoiceStatus: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3">
                  <span className="font-medium text-gray-900">Paid</span>
                  <span className="ml-2 text-sm text-gray-500">(payment already received)</span>
                </span>
              </label>
            </div>
          </div>
        )}

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

export default function NewTransactionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NewTransactionContent />
    </Suspense>
  )
}
