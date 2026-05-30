'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChartOfAccount } from '@/lib/types'
import { createAuthenticatedFetch } from '@/lib/auth'

interface ExtractedReceiptData {
  date: string
  amount: number
  description: string
  vendor_name: string
  type: 'RECEIPT' | 'INVOICE'
  account_type: 'ASSET' | 'EXPENSE'
  gst_hst_amount: number
  gst_hst_rate: number
  receiptImage: string
}

export default function ConfirmReceiptPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [formData, setFormData] = useState({
    accountId: '',
    date: '',
    amount: '',
    gstRate: '0',
    pstRate: '0-ab',
    customPstRate: '',
    description: '',
    type: 'RECEIPT',
    reference: '',
    taxIncluded: false,
    isVehicleExpense: false,
    businessUsePercentage: '100',
  })

  useEffect(() => {
    const data = sessionStorage.getItem('extractedReceiptData')
    if (!data) {
      router.push('/receipts')
      return
    }

    const parsed = JSON.parse(data) as ExtractedReceiptData
    setExtractedData(parsed)

    // Load saved GST/PST preferences from localStorage, or use extracted data
    const savedGstRate = localStorage.getItem('receiptDefaultGstRate')
    const savedPstRate = localStorage.getItem('receiptDefaultPstRate')

    let gstRate = savedGstRate || '0'
    let pstRate = savedPstRate || '0-ab'

    // Only use extracted rate if no saved preference exists
    if (!savedGstRate && !savedPstRate) {
      if (parsed.gst_hst_rate === 5) {
        gstRate = '5'
        pstRate = '0-ab'
      } else if (parsed.gst_hst_rate === 13) {
        gstRate = '5'
        pstRate = '8-on'
      } else if (parsed.gst_hst_rate > 5 && parsed.gst_hst_rate < 13) {
        // Likely a PST-only province
        gstRate = '0'
        pstRate = parsed.gst_hst_rate + '-other'
      }
    }

    setFormData({
      accountId: '',
      date: parsed.date,
      amount: parsed.amount.toString(),
      gstRate: gstRate,
      pstRate: pstRate,
      customPstRate: '',
      description: parsed.description || parsed.vendor_name,
      type: parsed.type,
      reference: '',
      taxIncluded: false,
      isVehicleExpense: false,
      businessUsePercentage: '100',
    })

    // Fallback expense accounts (for receipts)
    const fallbackAccounts: ChartOfAccount[] = [
      { id: 5100, code: '5100', name: 'Advertising', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5110, code: '5110', name: 'Meals and Entertainment (50% rule)', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5120, code: '5120', name: 'Insurance', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5130, code: '5130', name: 'Interest and Bank Charges', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5140, code: '5140', name: 'Business Taxes and Licenses', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5150, code: '5150', name: 'Office Expenses', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5160, code: '5160', name: 'Supplies', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5170, code: '5170', name: 'Legal and Accounting Fees', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5180, code: '5180', name: 'Rent', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5190, code: '5190', name: 'Salaries and Wages', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5200, code: '5200', name: 'Travel', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5210, code: '5210', name: 'Telephone and Utilities', type: 'EXPENSE', is_vehicle_expense: false },
      { id: 5220, code: '5220', name: 'Motor Vehicle Expenses', type: 'EXPENSE', is_vehicle_expense: true },
    ]

    const authenticatedFetch = createAuthenticatedFetch()
    authenticatedFetch('/api/chart-of-accounts')
      .then(r => {
        if (!r.ok) {
          console.warn('Failed to fetch accounts from API, using fallback')
          return null
        }
        return r.json()
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAccounts(data)
        } else {
          console.warn('No accounts from API, using fallback expense accounts')
          setAccounts(fallbackAccounts)
        }
      })
      .catch(err => {
        console.error('Error loading accounts:', err)
        console.warn('Using fallback expense accounts')
        setAccounts(fallbackAccounts)
      })
      .finally(() => setLoading(false))
  }, [router])

  // Save GST/PST preferences whenever they change
  useEffect(() => {
    localStorage.setItem('receiptDefaultGstRate', formData.gstRate)
    localStorage.setItem('receiptDefaultPstRate', formData.pstRate)
  }, [formData.gstRate, formData.pstRate])

  function calculateTaxAmount(amount: number, gstRate: number, pstRate: number, taxIncluded: boolean): { baseAmount: number; taxAmount: number } {
    const totalRate = gstRate + pstRate

    if (taxIncluded) {
      const baseAmount = amount / (1 + totalRate / 100)
      const taxAmount = amount - baseAmount
      return { baseAmount, taxAmount }
    } else {
      const baseAmount = amount
      const taxAmount = amount * (totalRate / 100)
      return { baseAmount, taxAmount }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const amount = parseFloat(formData.amount)

      // Validate amount
      if (!formData.amount || isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount greater than 0')
        setSaving(false)
        return
      }

      // Validate account selection
      if (!formData.accountId) {
        setError('Please select an account')
        setSaving(false)
        return
      }

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
          amount: baseAmount,
          gst_hst_rate: totalRate,
          gst_hst_amount: taxAmount,
          description: formData.description,
          type: formData.type,
          reference_number: formData.reference,
          is_vehicle_expense: formData.isVehicleExpense,
          business_use_percentage: formData.isVehicleExpense ? parseFloat(formData.businessUsePercentage) : undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to create transaction')

      const transaction = await response.json()

      if (extractedData?.receiptImage) {
        const imageData = extractedData.receiptImage.split(',')[1]
        const byteCharacters = atob(imageData)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/jpeg' })
        const imageFile = new File([blob], 'receipt.jpg', { type: 'image/jpeg' })

        const uploadFormData = new FormData()
        uploadFormData.append('file', imageFile)
        uploadFormData.append('transactionId', transaction.id.toString())

        await authenticatedFetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })
      }

      sessionStorage.removeItem('extractedReceiptData')

      // Show success message
      setSuccess(true)
      setSuccessMessage(`✅ Transaction saved! Amount: $${baseAmount.toFixed(2)} + $${taxAmount.toFixed(2)} tax = $${(baseAmount + taxAmount).toFixed(2)}`)

      // Redirect after 2 seconds to let user see success message
      setTimeout(() => {
        window.location.href = '/transactions'
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving transaction')
      setSaving(false)
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto py-8">Loading...</div>

  if (!extractedData) return null

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Confirm Receipt Details</h1>
      <p className="text-gray-600 mb-6">Review and edit the extracted information before saving</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 animate-pulse">
          <p className="font-medium text-lg">{successMessage}</p>
          <p className="text-sm mt-2">Redirecting to transactions...</p>
        </div>
      )}

      {!extractedData.amount || extractedData.amount === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <p className="font-medium">⚠️ Invoice Total Not Detected</p>
          <p className="text-sm mt-1">The receipt scanner couldn't extract the total amount. Please manually enter the invoice total below.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 lg:p-8 space-y-6">
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

            <div className="flex items-center p-3 border border-gray-300 rounded-lg">
              <input
                type="checkbox"
                id="isVehicleExpense"
                checked={formData.isVehicleExpense}
                onChange={(e) => setFormData({ ...formData, isVehicleExpense: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="isVehicleExpense" className="ml-3 font-medium text-gray-900 cursor-pointer">
                Motor Vehicle Expense (T2125 Tracking)
              </label>
            </div>

            {formData.isVehicleExpense && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Use Percentage *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={formData.businessUsePercentage}
                    onChange={(e) => setFormData({ ...formData, businessUsePercentage: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-gray-700 font-medium">%</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">Enter the percentage of business use for this vehicle expense (0-100%)</p>
              </div>
            )}

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
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => {
                    // Trim leading zeros and ensure valid amount
                    let value = e.target.value
                    if (value && parseFloat(value) === 0) {
                      value = ''
                    }
                    setFormData({ ...formData, amount: value })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
                {!formData.amount && (
                  <p className="mt-1 text-xs text-red-600">Amount is required</p>
                )}
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
                  <option value="custom">Custom PST/HST Rate</option>
                </select>
              </div>
            </div>

            {formData.pstRate === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom PST/HST Rate (%)</label>
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
                    if (formData.isVehicleExpense) {
                      return account.is_vehicle_expense === true
                    }
                    if (formData.type === 'INVOICE') return account.type === 'INCOME'
                    if (formData.type === 'RECEIPT') return account.type === 'EXPENSE' && !account.is_vehicle_expense
                    return true
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

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Transaction'}
              </button>
              <a
                href="/receipts"
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 font-medium text-center"
              >
                Cancel
              </a>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-4 z-10">
            <h3 className="text-lg font-bold mb-4">Receipt Image</h3>
            <img
              src={extractedData.receiptImage}
              alt="Receipt"
              className="w-full rounded-lg mb-4 border border-gray-200"
            />
            <div className="text-sm text-gray-600">
              <p className="mb-2"><strong>Vendor:</strong> {extractedData.vendor_name}</p>
              <p><strong>Extracted at:</strong> {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
