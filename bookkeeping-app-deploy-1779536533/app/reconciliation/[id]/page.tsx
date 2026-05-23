'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'

interface BankReconciliation {
  id: number
  account_name: string
  statement_date: string
  statement_opening_balance: number
  statement_closing_balance: number
  status: string
  matched_amount?: number
  variance?: number
  matched_count?: number
  unmatched_count?: number
}

interface ReconciliationItem {
  id: number
  transaction_id: number
  status: string
  transaction?: {
    id: number
    amount: number
    description: string
    transaction_date: string
  }
}

interface Transaction {
  id: number
  amount: number
  description: string
  transaction_date: string
  client_name: string
}

export default function ReconciliationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reconciliationId = parseInt(params.id as string)

  const [reconciliation, setReconciliation] = useState<BankReconciliation | null>(null)
  const [items, setItems] = useState<ReconciliationItem[]>([])
  const [eligibleTransactions, setEligibleTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completing, setCompleting] = useState(false)

  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchReconciliationDetails()
  }, [reconciliationId])

  async function fetchReconciliationDetails() {
    try {
      const response = await fetch(`/api/reconciliations?id=${reconciliationId}`)
      if (!response.ok) throw new Error('Failed to fetch reconciliation')
      const data = await response.json()
      setReconciliation(data.reconciliation)
      setItems(data.items || [])
      setEligibleTransactions(data.eligibleTransactions || [])
    } catch (err: any) {
      setError(err.message || 'Error loading reconciliation')
    } finally {
      setLoading(false)
    }
  }

  async function handleMatchTransaction(transactionId: number) {
    try {
      const response = await fetch(`/api/reconciliations/${reconciliationId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          status: 'MATCHED',
        }),
      })

      if (!response.ok) throw new Error('Failed to match transaction')

      // Refresh reconciliation details
      await fetchReconciliationDetails()
      setSelectedTransactions(new Set())
    } catch (err: any) {
      setError(err.message || 'Error matching transaction')
    }
  }

  async function handleCompleteReconciliation() {
    if (reconciliation?.variance !== 0) {
      setError('Cannot complete reconciliation with variance. Please match all transactions.')
      return
    }

    setCompleting(true)
    try {
      const response = await fetch(`/api/reconciliations/${reconciliationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })

      if (!response.ok) throw new Error('Failed to complete reconciliation')
      router.push('/reconciliation')
    } catch (err: any) {
      setError(err.message || 'Error completing reconciliation')
      setCompleting(false)
    }
  }

  if (loading) return <div className="text-center py-8">Loading reconciliation...</div>
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
  if (!reconciliation) return <div className="text-center py-8">Reconciliation not found</div>

  const unmatchedTransactions = eligibleTransactions.filter(
    t => !items.some(i => i.transaction_id === t.id && i.status === 'MATCHED')
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{reconciliation.account_name}</h1>
          <p className="text-gray-600">Statement ending {formatDate(reconciliation.statement_date)}</p>
        </div>
        <button
          onClick={() => router.push('/reconciliation')}
          className="text-gray-600 hover:text-gray-900"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Opening Balance</p>
          <p className="text-2xl font-bold">{formatCurrency(reconciliation.statement_opening_balance)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Closing Balance</p>
          <p className="text-2xl font-bold">{formatCurrency(reconciliation.statement_closing_balance)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Matched</p>
          <p className="text-2xl font-bold">{formatCurrency(reconciliation.matched_amount || 0)}</p>
        </div>
        <div className={`rounded-lg shadow-md p-4 ${reconciliation.variance === 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
          <p className="text-gray-600 text-sm">Variance</p>
          <p className={`text-2xl font-bold ${reconciliation.variance === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
            {formatCurrency(reconciliation.variance || 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Matched Transactions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Matched Transactions ({items.filter(i => i.status === 'MATCHED').length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {items.filter(i => i.status === 'MATCHED').map((item) => (
              <div
                key={item.id}
                className="p-3 bg-green-50 rounded border border-green-200"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{item.transaction?.description}</p>
                    <p className="text-sm text-gray-600">{formatDate(item.transaction?.transaction_date || '')}</p>
                  </div>
                  <p className="font-medium text-green-600">{formatCurrency(item.transaction?.amount || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unmatched Transactions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Available Transactions ({unmatchedTransactions.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unmatchedTransactions.map((txn) => (
              <button
                key={txn.id}
                onClick={() => handleMatchTransaction(txn.id)}
                className="w-full p-3 bg-gray-50 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-left transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{txn.description}</p>
                    <p className="text-sm text-gray-600">{formatDate(txn.transaction_date)} • {txn.client_name}</p>
                  </div>
                  <p className="font-medium text-gray-900">{formatCurrency(txn.amount)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="text-sm text-gray-600">
          <p>Status: <span className={`font-medium ${reconciliation.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>{reconciliation.status}</span></p>
          <p>Matched: {reconciliation.matched_count || 0} transactions</p>
          <p>Unmatched: {reconciliation.unmatched_count || 0} transactions</p>
        </div>

        {reconciliation.status !== 'COMPLETED' && (
          <button
            onClick={handleCompleteReconciliation}
            disabled={completing || reconciliation.variance !== 0}
            className={`w-full py-2 rounded-lg text-white font-medium transition ${
              reconciliation.variance === 0
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {completing ? 'Completing...' : 'Complete Reconciliation'}
          </button>
        )}
      </div>
    </div>
  )
}
