'use client'

import { useEffect, useState } from 'react'
import { createAuthenticatedFetch } from '@/lib/auth'
import { ChartOfAccount } from '@/lib/types'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)

  useEffect(() => {
    const authenticatedFetch = createAuthenticatedFetch()
    authenticatedFetch('/api/chart-of-accounts')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch accounts')
        return r.json()
      })
      .then(setAccounts)
      .catch(err => {
        console.error('Error fetching accounts:', err)
        setAccounts([])
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleInitializeDefaults() {
    setInitializing(true)
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch('/api/chart-of-accounts', {
        method: 'POST',
        body: JSON.stringify({ initializeDefaults: true }),
      })

      if (!response.ok) throw new Error('Failed to initialize accounts')

      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error initializing accounts:', error)
      alert('Failed to initialize accounts')
    } finally {
      setInitializing(false)
    }
  }

  const accountsByType = {
    ASSET: accounts.filter(a => a.type === 'ASSET'),
    LIABILITY: accounts.filter(a => a.type === 'LIABILITY'),
    EQUITY: accounts.filter(a => a.type === 'EQUITY'),
    INCOME: accounts.filter(a => a.type === 'INCOME'),
    EXPENSE: accounts.filter(a => a.type === 'EXPENSE'),
  }

  if (loading) {
    return <div className="text-center py-8">Loading accounts...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
        <p className="text-gray-600 mt-2">Manage your accounts and account structure</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex gap-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            + New Account
          </button>
          {accounts.length === 0 && (
            <button
              onClick={handleInitializeDefaults}
              disabled={initializing}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
            >
              {initializing ? 'Creating...' : '⚙️ Create Default Accounts'}
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-200">
          {['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map(type => (
            <div key={type}>
              <div className="p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900">{type}</h3>
              </div>
              <div className="p-4">
                {accountsByType[type as keyof typeof accountsByType].length > 0 ? (
                  <div className="space-y-2">
                    {accountsByType[type as keyof typeof accountsByType].map(acc => (
                      <div key={acc.id} className="flex justify-between items-center">
                        <span className="text-gray-900">
                          <strong>{acc.code}</strong> - {acc.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No accounts yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>No accounts set up yet.</strong> Click "Create Default Accounts" to set up a standard chart of accounts, or create accounts manually with the "+ New Account" button.
          </p>
        </div>
      )}
    </div>
  )
}
