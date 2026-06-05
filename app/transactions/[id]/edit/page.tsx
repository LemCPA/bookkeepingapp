'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ChartOfAccount } from '@/lib/types'
import { createAuthenticatedFetch } from '@/lib/auth'

interface Transaction {
  id: number
  client_id: number
  account_id: number
  account_name: string
  transaction_date: string
  amount: number
  gst_hst_rate: number
  gst_hst_amount: number
  description: string
  type: string
  reference_number?: string
  created_at: string
  updated_at?: string
  is_vehicle_expense?: boolean
  business_use_percentage?: number
}

export default function EditTransactionPage() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string)

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [accountId, setAccountId] = useState<string>('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [description, setDescription] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [gstRate, setGstRate] = useState<string>('0')
  const [pstRate, setPstRate] = useState<string>('0-ab')
  const [customPstRate, setCustomPstRate] = useState<string>('')
  const [gstHstAmount, setGstHstAmount] = useState<string>('0')
  const [isVehicleExpense, setIsVehicleExpense] = useState(false)
  const [businessUsePercentage, setBusinessUsePercentage] = useState<string>('100')

  useEffect(() => {
    const authenticatedFetch = createAuthenticatedFetch()

    Promise.all([
      authenticatedFetch(`/api/transactions?id=${id}`).then(r => r.json()),
      authenticatedFetch('/api/chart-of-accounts').then(r => r.json()),
      authenticatedFetch('/api/user/settings').then(r => r.json()),
    ]).then(([txnData, accts, settingsData]) => {
      const txn = Array.isArray(txnData) ? txnData[0] : txnData
      setTransaction(txn)
      setAccounts(accts)

      // Get default GST/HST rate from settings
      const defaultRate = settingsData?.default_gst_hst_rate ?? 0

      // Populate form
      if (txn) {
        setAccountId(txn.account_id?.toString() || '')
        setDate(txn.transaction_date || '')
        setAmount(txn.amount?.toString() || '')
        setDescription(txn.description || '')
        setReferenceNumber(txn.reference_number || '')
        setGstHstAmount((txn.gst_hst_amount ?? 0).toString())
        setIsVehicleExpense(txn.is_vehicle_expense ?? false)
        setBusinessUsePercentage((txn.business_use_percentage ?? 100).toString())

        // Map transaction's combined rate back to GST/PST components
        const transactionRate = txn.gst_hst_rate ?? defaultRate
        const gstComponent = transactionRate <= 5 ? transactionRate : 5
        const pstComponent = transactionRate > 5 ? transactionRate - 5 : 0

        // PST options mapping
        const pstOptions: { [key: number]: string } = {
          0: '0-ab',
          6: '6-sk',
          7: '7-bc',
          8: '8-on',
          10: '10-pe',
          9.975: '9.975-qc',
        }

        // Find the matching PST option or set to custom
        let pstOption = pstOptions[pstComponent] || 'custom'
        let customPstVal = ''
        if (pstComponent > 0 && !pstOptions[pstComponent]) {
          customPstVal = pstComponent.toString()
        }

        setGstRate(gstComponent.toString())
        setPstRate(pstOption)
        setCustomPstRate(customPstVal)
      }

      setLoading(false)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    if (!accountId || !date || !amount || !description) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError('')

    try {
      const gstComponentValue = parseFloat(gstRate)

      let pstComponentValue = 0
      if (pstRate === 'custom') {
        pstComponentValue = parseFloat(customPstRate)
      } else {
        // Extract numeric part from province code (e.g., "8-on" -> 8)
        const rateStr = pstRate.split('-')[0]
        pstComponentValue = parseFloat(rateStr)
      }

      const totalRate = gstComponentValue + pstComponentValue
      const taxAmount = parseFloat(amount) * (totalRate / 100)

      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch(`/api/transactions?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: parseInt(accountId),
          transaction_date: date,
          amount: parseFloat(amount),
          description,
          gst_hst_rate: totalRate,
          gst_hst_amount: taxAmount,
          reference_number: referenceNumber || undefined,
          is_vehicle_expense: isVehicleExpense,
          business_use_percentage: isVehicleExpense ? parseFloat(businessUsePercentage) : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update transaction')
      }

      router.push(`/transactions/${id}`)
    } catch (err: any) {
      setError(err.message || 'Error saving transaction')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!transaction) return <div>Transaction not found</div>

  const total = parseFloat(amount || '0') + parseFloat(gstHstAmount || '0')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Transaction</h1>
        <button
          onClick={() => router.push(`/transactions/${id}`)}
          className="text-gray-600 hover:text-gray-900"
        >
          ✕
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Account <span className="text-red-500">*</span></label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                !accountId ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Select account...</option>
              {accounts
                .filter(account => {
                  if (isVehicleExpense) {
                    return account.is_vehicle_expense === true
                  }
                  return account.type === 'EXPENSE' && !account.is_vehicle_expense
                })
                .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                !date ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Amount Before Tax <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                !amount ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-red-600 mb-1">Description <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              !description ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
        </div>

        <div className="flex items-center p-3 border border-gray-300 rounded-lg">
          <input
            type="checkbox"
            id="isVehicleExpense"
            checked={isVehicleExpense}
            onChange={(e) => setIsVehicleExpense(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="isVehicleExpense" className="ml-3 font-medium text-gray-900 cursor-pointer">
            Motor Vehicle Expense (T2125 Tracking)
          </label>
        </div>

        {isVehicleExpense && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Use Percentage *</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                value={businessUsePercentage}
                onChange={(e) => setBusinessUsePercentage(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-700 font-medium">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">Enter the percentage of business use for this vehicle expense (0-100%)</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Invoice #, Cheque #, etc."
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="font-medium text-gray-900 mb-4">Tax Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST (Federal)</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">No GST</option>
                <option value="5">5% GST</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PST/HST/QST (Provincial)</label>
              <select
                value={pstRate}
                onChange={(e) => setPstRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="0-ab">No PST/HST (Alberta)</option>
                <option value="6-sk">6% PST (Saskatchewan)</option>
                <option value="7-bc">7% PST (British Columbia)</option>
                <option value="8-on">8% HST (Ontario)</option>
                <option value="10-pe">10% HST (Prince Edward Island)</option>
                <option value="9.975-qc">9.975% QST (Quebec - in addition to GST)</option>
                <option value="custom">Custom PST/HST Rate</option>
              </select>
            </div>
          </div>

          {pstRate === 'custom' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom PST/HST Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={customPstRate}
                onChange={(e) => setCustomPstRate(e.target.value)}
                placeholder="Enter custom provincial tax rate"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="mb-3">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Total Tax Rate: </span>
              {(() => {
                const gst = parseFloat(gstRate)
                let pst = 0
                if (pstRate === 'custom') {
                  pst = parseFloat(customPstRate) || 0
                } else if (pstRate !== '0-ab') {
                  const rateStr = pstRate.split('-')[0]
                  pst = parseFloat(rateStr)
                }
                return (gst + pst).toFixed(2)
              })()}%
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Amount</div>
              <div className="text-lg font-medium">{formatCurrency(parseFloat(amount || '0'))}</div>
            </div>
            <div>
              <div className="text-gray-600">Tax</div>
              <div className="text-lg font-medium">{formatCurrency(parseFloat(gstHstAmount || '0'))}</div>
            </div>
            <div>
              <div className="text-gray-600">Total</div>
              <div className="text-lg font-bold">{formatCurrency(total)}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => router.push(`/transactions/${id}`)}
            className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
