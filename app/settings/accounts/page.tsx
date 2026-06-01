'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createAuthenticatedFetch } from '@/lib/auth'

// Cache-bust: Force reload to display hierarchy with correct parent_account_id references

interface Account {
  id: number
  code: string
  name: string
  type: string
  user_id?: number
  category?: 'BUSINESS' | 'HOME' | 'VEHICLE'
  parent_account_id?: number
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
      try {
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
      } catch (error) {
        console.error('Error fetching user settings:', error)
      }

      // Fetch accounts
      try {
        const accountsRes = await authenticatedFetch('/api/chart-of-accounts')
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(Array.isArray(accountsData) ? accountsData : [])
        } else {
          console.error('API error fetching accounts:', accountsRes.status)
          setAccounts([])
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
        setAccounts([])
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setMessage('Failed to load settings')
      setAccounts([])
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
                  {message && (
                    <div className={`p-4 rounded-lg mb-4 ${message.includes('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      {message}
                    </div>
                  )}

                  {accounts.length === 0 ? (
                    <div className="p-6 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-500">No accounts set up yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                      {/* Column 1: INCOME */}
                      <div>
                        <div className="bg-gray-50 p-4 border-b border-gray-200">
                          <h3 className="font-semibold text-gray-900 text-sm uppercase">INCOME</h3>
                        </div>
                        <div className="p-4">
                          {(() => {
                            const incomeAccounts = accounts.filter(a => a.type === 'INCOME')
                            return incomeAccounts.length > 0 ? (
                              <div className="space-y-2">
                                {incomeAccounts.map(acc => (
                                  <div key={acc.id} className="flex gap-2 text-sm">
                                    <span className="text-gray-900 font-semibold flex-shrink-0 min-w-max">{acc.code}</span>
                                    <span className="text-gray-600 text-xs">{acc.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No accounts</p>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Column 2: BUSINESS EXPENSES */}
                      <div>
                        <div className="bg-gray-50 p-4 border-b border-gray-200">
                          <h3 className="font-semibold text-gray-900 text-sm uppercase">BUSINESS</h3>
                        </div>
                        <div className="p-4">
                          {(() => {
                            const businessAccounts = accounts.filter(a => a.category === 'BUSINESS')
                            return businessAccounts.length > 0 ? (
                              <div className="space-y-2">
                                {businessAccounts.map(acc => (
                                  <div key={acc.id} className="flex gap-2 text-sm">
                                    <span className="text-gray-900 font-semibold flex-shrink-0 min-w-max">{acc.code}</span>
                                    <span className="text-gray-600 text-xs">{acc.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No accounts</p>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Column 3: VEHICLE EXPENSES with Hierarchy */}
                      <div>
                        <div className="bg-gray-50 p-4 border-b border-gray-200">
                          <h3 className="font-semibold text-gray-900 text-sm uppercase">VEHICLE</h3>
                        </div>
                        <div className="p-4">
                          {(() => {
                            const vehicleParent = accounts.find(a => a.code === '9281')
                            if (!vehicleParent) return <p className="text-gray-500 text-sm">No accounts</p>

                            const vehicleChildren = accounts.filter(a => a.parent_account_id === vehicleParent.id && a.user_id === vehicleParent.user_id)
                            return (
                              <div className="space-y-2">
                                <div className="flex gap-2 text-sm">
                                  <span className="text-gray-900 font-semibold flex-shrink-0 min-w-max">{vehicleParent.code}</span>
                                  <span className="text-gray-600 text-xs">{vehicleParent.name}</span>
                                </div>
                                {vehicleChildren.length > 0 && (
                                  <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-300 pl-3">
                                    {vehicleChildren.map((child) => (
                                      <div key={child.id} className="text-gray-600 text-xs">
                                        {child.name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Column 4: HOME EXPENSES with Hierarchy */}
                      <div>
                        <div className="bg-gray-50 p-4 border-b border-gray-200">
                          <h3 className="font-semibold text-gray-900 text-sm uppercase">HOME</h3>
                        </div>
                        <div className="p-4">
                          {(() => {
                            const homeParent = accounts.find(a => a.code === '9945')
                            if (!homeParent) return <p className="text-gray-500 text-sm">No accounts</p>

                            const homeChildren = accounts.filter(a => a.parent_account_id === homeParent.id && a.user_id === homeParent.user_id)
                            return (
                              <div className="space-y-2">
                                <div className="flex gap-2 text-sm">
                                  <span className="text-gray-900 font-semibold flex-shrink-0 min-w-max">{homeParent.code}</span>
                                  <span className="text-gray-600 text-xs">{homeParent.name}</span>
                                </div>
                                {homeChildren.length > 0 && (
                                  <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-300 pl-3">
                                    {homeChildren.map((child) => (
                                      <div key={child.id} className="text-gray-600 text-xs">
                                        {child.name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
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
