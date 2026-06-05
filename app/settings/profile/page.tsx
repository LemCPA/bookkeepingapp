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

type MenuItem = 'profile'

export default function ProfileSettingsPage() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState<MenuItem>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Business profile fields
  const [businessName, setBusinessName] = useState('')
  const [addressStreet, setAddressStreet] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone, setPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [gstRegistered, setGstRegistered] = useState(false)
  const [gstNumber, setGstNumber] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const authenticatedFetch = createAuthenticatedFetch()

      // Fetch all settings including business profile
      const settingsRes = await authenticatedFetch('/api/user/settings')
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setBusinessName(data.business_name || '')
        setAddressStreet(data.address_street || '')
        setCity(data.city || '')
        setProvince(data.province || '')
        setPostalCode(data.postal_code || '')
        setPhone(data.phone || '')
        setBusinessEmail(data.business_email || '')
        setGstRegistered(data.gst_registered || false)
        setGstNumber(data.gst_number || '')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setMessage('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    setMessage('')
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const res = await authenticatedFetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          address_street: addressStreet,
          city: city,
          province: province,
          postal_code: postalCode,
          phone: phone,
          business_email: businessEmail,
          gst_registered: gstRegistered,
          gst_number: gstNumber,
        }),
      })

      if (res.ok) {
        setMessage('✓ Business profile saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Failed to save profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage('Error saving profile')
    } finally {
      setSaving(false)
    }
  }

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

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-4">
            {/* Business Profile Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Profile</h3>
                <p className="text-gray-600 mb-4">
                  Manage your business information and tax details
                </p>

                {message && (
                  <div className={`p-4 rounded-lg mb-4 ${message.includes('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {message}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Business Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Your business name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Address */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                        placeholder="123 Main Street"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Toronto"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select province</option>
                        <option value="AB">Alberta</option>
                        <option value="BC">British Columbia</option>
                        <option value="MB">Manitoba</option>
                        <option value="NB">New Brunswick</option>
                        <option value="NL">Newfoundland and Labrador</option>
                        <option value="NS">Nova Scotia</option>
                        <option value="ON">Ontario</option>
                        <option value="PE">Prince Edward Island</option>
                        <option value="QC">Quebec</option>
                        <option value="SK">Saskatchewan</option>
                        <option value="NT">Northwest Territories</option>
                        <option value="NU">Nunavut</option>
                        <option value="YT">Yukon</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="M5V 3A8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(416) 555-0123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                      <input
                        type="email"
                        value={businessEmail}
                        onChange={(e) => setBusinessEmail(e.target.value)}
                        placeholder="business@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* GST/HST Registration */}
                  <div className="border-t border-gray-200 pt-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">GST/HST Registration</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={gstRegistered}
                          onChange={(e) => setGstRegistered(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          My business is registered for GST/HST
                        </span>
                      </label>

                      {gstRegistered && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Business Number (RT)</label>
                          <input
                            type="text"
                            value={gstNumber}
                            onChange={(e) => {
                              // Only allow the exact format: 9 digits + 2 letters + 4 digits
                              const input = e.target.value.toUpperCase()
                              if (input === '' || /^\d{0,9}[A-Z]{0,2}\d{0,4}$/.test(input)) {
                                setGstNumber(input)
                              }
                            }}
                            placeholder="123456789RT0001"
                            maxLength={15}
                            pattern="\d{9}[A-Z]{2}\d{4}"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-1">Exactly 15 characters: 9 digits + 2 letters + 4 digits</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 transition"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
