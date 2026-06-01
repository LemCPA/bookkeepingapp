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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* Left Column: INCOME */}
          <div>
            <div className="border-b border-gray-200">
              <div className="p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900">INCOME</h3>
              </div>
              <div className="p-4">
                {accountsByType.INCOME.length > 0 ? (
                  <div className="space-y-2">
                    {accountsByType.INCOME.map(acc => (
                      <div key={acc.id} className="flex gap-3">
                        <span className="text-gray-900 font-semibold flex-shrink-0">
                          {acc.code}
                        </span>
                        <span className="text-gray-700 text-sm break-words">
                          {acc.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No accounts yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Expenses with Hierarchy */}
          <div>
            <div className="p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900">EXPENSE</h3>
            </div>
            <div className="p-4">
              {accountsByType.EXPENSE.length > 0 ? (
                <div className="space-y-2">
                  {accountsByType.EXPENSE.map(acc => {
                    // Get sub-accounts for 9945 (Business-Use-of-Home) and 9281 (Motor Vehicle)
                    let hasSubAccounts = false
                    let subAccounts: string[] = []

                    if (acc.code === '9945') {
                      subAccounts = ['Heat', 'Electricity', 'Insurance', 'Maintenance', 'Mortgage Interest', 'Property Taxes', 'Other Expenses']
                      hasSubAccounts = true
                    } else if (acc.code === '9281') {
                      subAccounts = ['Fuel & Oil', 'Interest', 'Insurance', 'License and Registration', 'Maintenance and Repairs', 'Leasing', 'Electricity for Zero-Emission Vehicles', 'Other Vehicle Expenses', 'Business Parking Fees']
                      hasSubAccounts = true
                    }

                    return (
                      <div key={acc.id}>
                        {/* Parent Account */}
                        <div className="flex gap-3">
                          <span className="text-gray-900 font-semibold flex-shrink-0 min-w-fit">
                            {acc.code}
                          </span>
                          <span className="text-gray-700 text-sm break-words">
                            {acc.name}
                          </span>
                        </div>

                        {/* Sub-accounts (indented) */}
                        {hasSubAccounts && (
                          <div className="mt-1 ml-6 space-y-1 border-l-2 border-gray-300 pl-3">
                            {subAccounts.map((subName) => (
                              <div key={subName} className="text-gray-600 text-sm">
                                {subName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No accounts yet</p>
              )}
            </div>
          </div>
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
