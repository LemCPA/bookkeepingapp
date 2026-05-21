'use client'

import { useEffect, useState } from 'react'
import { Client, ChartOfAccount } from '@/lib/types'

export default function NewTransactionPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    clientId: '',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    gstHstRate: '0',
    description: '',
    type: 'RECEIPT',
    reference: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()).then(data => setClients(Array.isArray(data) ? data : [])).catch(() => setClients([])),
      fetch('/api/chart-of-accounts').then(r => r.json()).then(data => setAccounts(Array.isArray(data) ? data : [])).catch(() => setAccounts([])),
    ]).finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const amount = parseFloat(formData.amount)
      const gstHstRate = parseFloat(formData.gstHstRate)
      const gstHstAmount = amount * (gstHstRate / 100)

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: parseInt(formData.clientId),
          account_id: parseInt(formData.accountId),
          transaction_date: formData.date,
          amount: amount,
          gst_hst_rate: gstHstRate,
          gst_hst_amount: gstHstAmount,
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

        await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })
      }

      // Reset form and redirect
      setFormData({
        clientId: '',
        accountId: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        gstHstRate: '0',
        description: '',
        type: 'RECEIPT',
        reference: '',
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select
              required
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST/HST Rate</label>
            <select
              value={formData.gstHstRate}
              onChange={(e) => setFormData({ ...formData, gstHstRate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="0">No GST/HST</option>
              <option value="5">5% GST</option>
              <option value="13">13% HST</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST/HST Amount</label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
              <span className="text-gray-600">
                {formData.amount && formData.gstHstRate
                  ? `$${(parseFloat(formData.amount) * (parseFloat(formData.gstHstRate) / 100)).toFixed(2)}`
                  : '$0.00'
                }
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
          <select
            required
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an account</option>
            {accounts.map((account) => (
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
