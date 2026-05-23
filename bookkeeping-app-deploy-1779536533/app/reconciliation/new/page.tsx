'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface Account {
  id: number
  name: string
  code: string
  type: string
}

export default function NewReconciliationPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [accountId, setAccountId] = useState<string>('')
  const [statementDate, setStatementDate] = useState('')
  const [openingBalance, setOpeningBalance] = useState<string>('')
  const [closingBalance, setClosingBalance] = useState<string>('')

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    try {
      const response = await fetch('/api/chart-of-accounts')
      if (!response.ok) throw new Error('Failed to fetch accounts')
      const data = await response.json()
      // Filter to only ASSET type accounts (bank accounts)
      const bankAccounts = data.filter((a: Account) => a.type === 'ASSET')
      setAccounts(bankAccounts)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'Error loading accounts')
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!accountId || !statementDate || !openingBalance || !closingBalance) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/reconciliations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 1, // TODO: Get from context/session
          account_id: parseInt(accountId),
          statement_date: statementDate,
          statement_opening_balance: parseFloat(openingBalance),
          statement_closing_balance: parseFloat(closingBalance),
        }),
      })

      if (!response.ok) throw new Error('Failed to create reconciliation')
      const data = await response.json()
      router.push(`/reconciliation/${data.reconciliation.id}`)
    } catch (err: any) {
      setError(err.message || 'Error creating reconciliation')
      setSaving(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Start New Reconciliation</h1>
        <button
          onClick={() => router.push('/reconciliation')}
          className="text-gray-600 hover:text-gray-900"
        >
          ✕
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statement Date *</label>
              <input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance *</label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closing Balance *</label>
              <input
                type="number"
                step="0.01"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">
              <p>Difference to reconcile: <span className="font-medium">{
                closingBalance && openingBalance
                  ? formatCurrency(parseFloat(closingBalance) - parseFloat(openingBalance))
                  : formatCurrency(0)
              }</span></p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? 'Starting...' : 'Start Reconciliation'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/reconciliation')}
              className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
