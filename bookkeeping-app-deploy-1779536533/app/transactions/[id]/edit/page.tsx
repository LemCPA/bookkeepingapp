'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Client, ChartOfAccount } from '@/lib/types'

interface Transaction {
  id: number
  client_id: number
  account_id: number
  client_name: string
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
}

export default function EditTransactionPage() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string)

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [clientId, setClientId] = useState<string>('')
  const [accountId, setAccountId] = useState<string>('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [description, setDescription] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [gstHstRate, setGstHstRate] = useState<string>('0')
  const [gstHstAmount, setGstHstAmount] = useState<string>('0')

  useEffect(() => {
    Promise.all([
      fetch(`/api/transactions?id=${id}`).then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/chart-of-accounts').then(r => r.json()),
    ]).then(([txnData, cls, accts]) => {
      const txn = Array.isArray(txnData) ? txnData[0] : txnData
      setTransaction(txn)
      setClients(cls)
      setAccounts(accts)

      // Populate form
      if (txn) {
        setClientId(txn.client_id?.toString() || '')
        setAccountId(txn.account_id?.toString() || '')
        setDate(txn.transaction_date || '')
        setAmount(txn.amount?.toString() || '')
        setDescription(txn.description || '')
        setReferenceNumber(txn.reference_number || '')
        setGstHstRate((txn.gst_hst_rate ?? 0).toString())
        setGstHstAmount((txn.gst_hst_amount ?? 0).toString())
      }

      setLoading(false)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    if (!clientId || !accountId || !date || !amount || !description) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: parseInt(clientId),
          account_id: parseInt(accountId),
          transaction_date: date,
          amount: parseFloat(amount),
          description,
          gst_hst_rate: parseFloat(gstHstRate),
          gst_hst_amount: parseFloat(gstHstAmount),
          reference_number: referenceNumber || undefined,
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">GST/HST Rate (%)</label>
              <select
                value={gstHstRate}
                onChange={(e) => setGstHstRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">No GST/HST</option>
                <option value="5">5% GST</option>
                <option value="13">13% HST</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST/HST Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={gstHstAmount}
                onChange={(e) => setGstHstAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Amount</div>
              <div className="text-lg font-medium">{formatCurrency(parseFloat(amount || '0'))}</div>
            </div>
            <div>
              <div className="text-gray-600">GST/HST</div>
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
