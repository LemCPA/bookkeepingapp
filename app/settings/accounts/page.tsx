'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createAuthenticatedFetch } from '@/lib/auth'

interface Account {
  id: number
  code: string
  name: string
  type: string
  user_id?: number
}

type MenuItem = 'gst' | 'accounts'

export default function AccountsSettingsPage() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState<MenuItem>(() =>
    pathname.includes('/settings/accounts') ? 'accounts' : 'gst'
  )
  const [defaultGstRate, setDefaultGstRate] = useState('0')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Determine active section from pathname
    if (pathname.includes('/settings/accounts')) {
      setActiveSection('accounts')
    } else {
      setActiveSection('gst')
    }
    fetchData()
  }, [pathname])

  async function fetchData() {
    try {
      const authenticatedFetch = createAuthenticatedFetch()

      // Fetch GST settings
      const settingsRes = await authenticatedFetch('/api/user/settings')
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        // Convert numeric rate back to province code for display
        const rateToProvince: { [key: number]: string } = {
          5: 'ab',   // Default to Alberta for 5% GST (most common)
          13: 'on',  // Ontario HST
          15: 'nb',  // Default to New Brunswick for 15% HST (most common)
        }
        const provinceCode = rateToProvince[data.default_gst_hst_rate] || 'on'
        setDefaultGstRate(provinceCode)
      }

      // Fetch accounts
      const accountsRes = await authenticatedFetch('/api/chart-of-accounts')
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(Array.isArray(accountsData) ? accountsData : [])
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setMessage('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveGst() {
    setSaving(true)
    setMessage('')
    try {
      // Map province codes to numeric GST/HST rates
      const provinceToGstRate: { [key: string]: number } = {
        'ab': 5,  // Alberta: 5% GST
        'bc': 5,  // British Columbia: 5% GST
        'mb': 5,  // Manitoba: 5% GST
        'sk': 5,  // Saskatchewan: 5% GST
        'on': 13, // Ontario: 13% HST
        'qc': 5,  // Quebec: 5% GST (separate QST)
        'nb': 15, // New Brunswick: 15% HST
        'ns': 15, // Nova Scotia: 15% HST
        'pe': 15, // Prince Edward Island: 15% HST
        'nl': 15, // Newfoundland and Labrador: 15% HST
        'nt': 5,  // Northwest Territories: 5% GST
        'nu': 5,  // Nunavut: 5% GST
        'yt': 5,  // Yukon: 5% GST
      }

      const gstRate = provinceToGstRate[defaultGstRate]
      if (gstRate === undefined) {
        setMessage('Please select a valid province')
        return
      }

      const authenticatedFetch = createAuthenticatedFetch()
      const res = await authenticatedFetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_gst_hst_rate: gstRate,
        }),
      })

      if (res.ok) {
        setMessage('✓ GST/HST settings saved successfully!')
        // Refresh data to confirm save and update UI
        setTimeout(() => {
          fetchData()
          setMessage('')
        }, 1500)
      } else {
        setMessage('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateDefaults() {
    setSaving(true)
    setMessage('')
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const res = await authenticatedFetch('/api/chart-of-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initializeDefaults: true }),
      })

      if (res.ok) {
        setMessage('✓ Default accounts created successfully!')
        setTimeout(() => fetchData(), 1500)
      } else {
        setMessage('Failed to create default accounts')
      }
    } catch (error) {
      console.error('Error creating accounts:', error)
      setMessage('Error creating default accounts')
    } finally {
      setSaving(false)
    }
  }

  const menuItems: { id: MenuItem; label: string }[] = [
    { id: 'gst', label: 'Default GST/HST' },
    { id: 'accounts', label: 'Chart of Accounts' },
  ]

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>
  }

  return (
    <div className="bg-gray-100 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600 mt-2">Manage your business accounts for categorizing transactions</p>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-8">
            {/* Chart of Accounts Section */}
            <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Chart of Accounts</h3>
                      <p className="text-gray-600 text-sm mt-1">Manage your business accounts for categorizing transactions</p>
                    </div>
                    {accounts.length === 0 ? (
                      <button
                        onClick={handleCreateDefaults}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 transition"
                      >
                        {saving ? 'Creating...' : 'Create Default Accounts'}
                      </button>
                    ) : null}
                  </div>

                  {message && (
                    <div className={`p-4 rounded-lg mb-4 ${message.includes('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      {message}
                    </div>
                  )}

                  {accounts.length === 0 ? (
                    <div className="p-6 bg-gray-100 rounded-lg text-center">
                      <p className="text-gray-600 mb-4">No accounts set up yet</p>
                      <button
                        onClick={handleCreateDefaults}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 transition"
                      >
                        {saving ? 'Creating...' : 'Create Default Accounts'}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Group accounts by type */}
                      {['INCOME', 'EXPENSE'].map(type => {
                        const typeAccounts = accounts.filter(a => a.type === type)
                        if (typeAccounts.length === 0) return null

                        return (
                          <div key={type} className="bg-gray-100 rounded-lg p-4 cursor-pointer hover:bg-gray-700 hover:text-white transition-colors duration-200">
                            <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase hover:text-white">{type}</h4>
                            <div className="space-y-2">
                              {typeAccounts.map(account => (
                                <div key={account.id} className="text-sm flex items-center gap-3">
                                  <p className="text-gray-900 font-medium hover:text-white min-w-max">{account.code}</p>
                                  <p className="text-gray-600 text-xs hover:text-gray-200">{account.name}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
