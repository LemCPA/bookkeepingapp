'use client'

import { useEffect, useState } from 'react'
import { createAuthenticatedFetch } from '@/lib/auth'
import { ChartOfAccount } from '@/lib/types'

// Force redeploy: Database fix 42fa139 - Hierarchical account display

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

  // Get parent expense accounts (9945, 9281) and filter out their children from main list
  const parentAccountCodes = ['9945', '9281']
  const parentAccountIds = accounts
    .filter(a => parentAccountCodes.includes(a.code))
    .map(a => a.id)

  // For display, show only parent accounts in main list, not their children
  const expenseAccountsForDisplay = accountsByType.EXPENSE.filter(
    a => !a.parent_account_id || parentAccountIds.includes(a.id)
  )

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* Left Column: INCOME (1/3 width) */}
          <div className="lg:col-span-1">
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

          {/* Middle Column: Other Expenses (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="border-b border-gray-200">
              <div className="p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900">EXPENSE</h3>
              </div>
              <div className="p-4">
                {expenseAccountsForDisplay.length > 0 ? (
                  <div className="space-y-2">
                    {expenseAccountsForDisplay.filter(a => !['9945', '9281'].includes(a.code)).map(acc => (
                      <div key={acc.id} className="flex gap-3">
                        <span className="text-gray-900 font-semibold flex-shrink-0 min-w-fit">
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

          {/* Right Column: Home & Vehicle Expenses with Hierarchy (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="border-b border-gray-200">
              <div className="p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900">HOME & VEHICLE</h3>
              </div>
              <div className="p-4">
                {expenseAccountsForDisplay.filter(a => ['9945', '9281'].includes(a.code)).length > 0 ? (
                  <div className="space-y-3">
                    {expenseAccountsForDisplay.filter(a => ['9945', '9281'].includes(a.code)).map(acc => {
                      // Get child accounts for this parent (same user only)
                      const childAccounts = accounts.filter(a => a.parent_account_id === acc.id && a.user_id === acc.user_id)
                      const hasChildren = childAccounts.length > 0

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

                          {/* Child accounts (indented) */}
                          {hasChildren && (
                            <div className="mt-1 ml-6 space-y-1 border-l-2 border-gray-300 pl-3">
                              {childAccounts.map((child) => (
                                <div key={child.id} className="text-gray-600 text-sm">
                                  {child.name}
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
// Force redeploy Mon Jun  1 00:02:20 EDT 2026
