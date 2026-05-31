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

export default function GstSettingsPage() {
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

  useEffect(() => {
    console.log('defaultGstRate changed to:', defaultGstRate)
  }, [defaultGstRate])

  async function fetchData() {
    try {
      const authenticatedFetch = createAuthenticatedFetch()

      // Fetch GST settings
      const settingsRes = await authenticatedFetch('/api/user/settings')
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        console.log('API returned default_gst_hst_rate:', data.default_gst_hst_rate, 'province:', data.default_gst_hst_province)
        // Use province code if available, otherwise convert from rate
        let provinceCode = data.default_gst_hst_province
        if (!provinceCode) {
          // Fallback: convert numeric rate back to province code
          const rateToProvince: { [key: number]: string } = {
            5: 'ab',   // Default to Alberta for 5% GST (most common)
            13: 'on',  // Ontario HST
            15: 'nb',  // Default to New Brunswick for 15% HST (most common)
          }
          provinceCode = rateToProvince[data.default_gst_hst_rate] || 'on'
        }
        console.log('Setting province code to:', provinceCode)
        setDefaultGstRate(provinceCode)
      } else {
        console.error('Failed to fetch settings:', settingsRes.status)
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

      // Convert province code to numeric GST rate
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
          default_gst_hst_province: defaultGstRate, // Send the province code
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
        const errorData = await res.json()
        setMessage(errorData.error || 'Failed to save settings')
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
    <div className="bg-gray-100 min-h-screen py-4">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-1.5">
          <h1 className="text-2xl font-bold text-gray-900">Default GST/HST Settings</h1>
          <p className="text-gray-600 text-sm mt-0.5">Set your default GST/HST rate for transactions</p>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-4 pt-3">
            {/* GST/HST Section */}
            <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5">Default GST/HST Rate</h3>
                  <p className="text-gray-600 text-xs mb-2">
                    Set your default GST/HST rate. This will be automatically applied when creating new transactions.
                  </p>

                  <div className="space-y-1">
                    {[
                      { value: 'ab', label: 'Alberta', gst: '5%', pst: 'None', hst: 'N/A' },
                      { value: 'bc', label: 'British Columbia', gst: '5%', pst: '7%', hst: 'N/A' },
                      { value: 'mb', label: 'Manitoba', gst: '5%', pst: '8%', hst: 'N/A' },
                      { value: 'sk', label: 'Saskatchewan', gst: '5%', pst: '6%', hst: 'N/A' },
                      { value: 'on', label: 'Ontario', gst: 'N/A', pst: 'N/A', hst: '13%' },
                      { value: 'qc', label: 'Quebec', gst: '5%', pst: 'N/A', hst: 'QST 9.975%' },
                      { value: 'nb', label: 'New Brunswick', gst: 'N/A', pst: 'N/A', hst: '15%' },
                      { value: 'ns', label: 'Nova Scotia', gst: 'N/A', pst: 'N/A', hst: '15%' },
                      { value: 'pe', label: 'Prince Edward Island', gst: 'N/A', pst: 'N/A', hst: '15%' },
                      { value: 'nl', label: 'Newfoundland and Labrador', gst: 'N/A', pst: 'N/A', hst: '15%' },
                      { value: 'nt', label: 'Northwest Territories', gst: '5%', pst: 'None', hst: 'N/A' },
                      { value: 'nu', label: 'Nunavut', gst: '5%', pst: 'None', hst: 'N/A' },
                      { value: 'yt', label: 'Yukon', gst: '5%', pst: 'None', hst: 'N/A' },
                    ].map(option => (
                      <label key={option.value} className="flex items-start p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                        <input
                          type="radio"
                          name="province"
                          value={option.value}
                          checked={defaultGstRate === option.value}
                          onChange={(e) => setDefaultGstRate(e.target.value)}
                          className="w-4 h-4 text-blue-600 mt-0.5"
                        />
                        <div className="ml-2 flex-1">
                          <div className="font-medium text-gray-900 text-xs">{option.label}</div>
                          <div className="text-xs text-gray-600 mt-0.5 grid grid-cols-3 gap-2">
                            <div>GST: <span className="font-semibold">{option.gst}</span></div>
                            <div>PST: <span className="font-semibold">{option.pst}</span></div>
                            <div>HST: <span className="font-semibold">{option.hst}</span></div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {message && (
                  <div className={`p-3 rounded text-sm font-medium ${message.includes('✓') ? 'bg-green-100 border border-green-400 text-green-900' : 'bg-red-100 border border-red-400 text-red-900'}`}>
                    {message}
                  </div>
                )}

                <div className="flex gap-2 pt-1.5 border-t border-gray-200">
                  <button
                    onClick={handleSaveGst}
                    disabled={saving}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-1.5">
                  <h4 className="font-semibold text-blue-900 text-xs mb-1">How it works</h4>
                  <ul className="text-xs text-blue-800 space-y-0 list-disc list-inside">
                    <li>Your default GST/HST rate will be automatically selected when creating new transactions</li>
                    <li>You can override it for individual transactions if needed</li>
                    <li>This applies to all new receipts and invoices</li>
                  </ul>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}
