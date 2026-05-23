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

export default function SettingsPage() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState<MenuItem>('gst')
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
        setDefaultGstRate(data.default_gst_hst_rate.toString())
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
      const authenticatedFetch = createAuthenticatedFetch()
      const res = await authenticatedFetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_gst_hst_rate: parseInt(defaultGstRate),
        }),
      })

      if (res.ok) {
        setMessage('✓ GST/HST settings saved successfully!')
        setTimeout(() => setMessage(''), 3000)
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
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your business settings and configuration</p>
        </div>

        {/* Section Navigation */}
        <div className="mb-6 flex gap-2">
          {menuItems.map(item => (
            <a
              key={item.id}
              href={item.id === 'gst' ? '/settings/gst' : '/settings/accounts'}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeSection === item.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-8">
            {/* GST/HST Section */}
            {activeSection === 'gst' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Default GST/HST Rate</h3>
                  <p className="text-gray-600 mb-4">
                    Set your default GST/HST rate. This will be automatically applied when creating new transactions.
                  </p>

                  <div className="space-y-3">
                    {[
                      { value: '0', label: 'No GST/HST' },
                      { value: '5', label: '5% GST (BC, AB, NT, NU, YT)' },
                      { value: '9', label: '9% PST + 5% GST (BC)' },
                      { value: '10', label: '10% PST + 5% GST (SK)' },
                      { value: '13', label: '13% HST (ON, NB, NS, PE, NL)' },
                      { value: '15', label: '15% HST (NS)' },
                      { value: '8', label: '8% PST + 5% GST (MB)' },
                    ].map(option => (
                      <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                        <input
                          type="radio"
                          name="gstRate"
                          value={option.value}
                          checked={defaultGstRate === option.value}
                          onChange={(e) => setDefaultGstRate(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="ml-3 font-medium text-gray-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-lg ${message.includes('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {message}
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveGst}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 transition"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">How it works</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Your default GST/HST rate will be automatically selected when creating new transactions</li>
                    <li>You can override it for individual transactions if needed</li>
                    <li>This applies to all new receipts and invoices</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Chart of Accounts Section */}
            {activeSection === 'accounts' && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Chart of Accounts</h3>
                      <p className="text-gray-600 text-sm mt-1">Manage your business accounts for categorizing transactions</p>
                    </div>
                    {accounts.length === 0 && (
                      <button
                        onClick={handleCreateDefaults}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 transition"
                      >
                        {saving ? 'Creating...' : 'Create Default Accounts'}
                      </button>
                    )}
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
                      {['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE', 'COGS'].map(type => {
                        const typeAccounts = accounts.filter(a => a.type === type)
                        if (typeAccounts.length === 0) return null

                        return (
                          <div key={type} className="bg-gray-100 rounded-lg p-4 cursor-pointer hover:bg-gray-700 hover:text-white transition-colors duration-200">
                            <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase hover:text-white">{type}</h4>
                            <div className="space-y-2">
                              {typeAccounts.map(account => (
                                <div key={account.id} className="text-sm">
                                  <p className="text-gray-900 font-medium hover:text-white">{account.code}</p>
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
