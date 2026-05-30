'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createAuthenticatedFetch, getAccessToken, getRefreshToken } from '@/lib/auth'

export default function MileageSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    odometerReading: '',
    setupDate: new Date().toISOString().split('T')[0],
    notes: '',
  })

  // Check if baseline already exists and load it for editing
  useEffect(() => {
    const checkBaseline = async () => {
      try {
        const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
        const response = await authenticatedFetch('/api/mileage/baseline')
        if (response.ok) {
          const data = await response.json()
          // Check if baseline exists - either via data.baseline property or data.id property
          const hasBaseline = !!(data.baseline || data.id)
          if (hasBaseline) {
            // Pre-fill the form with existing baseline data
            setFormData(prev => ({
              ...prev,
              odometerReading: data.odometerReading?.toString() || '',
              setupDate: data.setupDate || new Date().toISOString().split('T')[0],
              notes: data.notes || '',
            }))
          }
        }
      } catch (err) {
        console.error('Error checking baseline:', err)
      } finally {
        setLoading(false)
      }
    }

    checkBaseline()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch('/api/mileage/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odometerReading: parseInt(formData.odometerReading),
          setupDate: formData.setupDate,
          notes: formData.notes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to set vehicle baseline')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/mileage')
        router.refresh()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Set Up Vehicle Mileage Tracking</h1>
          <p className="text-gray-600 mb-6">Enter your vehicle's current odometer reading to begin tracking business mileage</p>

          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              Vehicle baseline set successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Odometer Reading */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Odometer Reading (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="odometerReading"
                value={formData.odometerReading}
                onChange={handleChange}
                required
                placeholder="e.g., 85000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">This is the starting point for your mileage tracking</p>
            </div>

            {/* Setup Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Baseline Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="setupDate"
                value={formData.setupDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">When you acquired this vehicle or started tracking (defaults to today)</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="e.g., Vehicle: 2020 Toyota Camry, License: ABC 123"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">📋 How It Works</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✓ Enter your vehicle's current odometer reading above</li>
                <li>✓ Log each business trip with kilometers driven and purpose</li>
                <li>✓ Business percentage is auto-calculated based on trip type</li>
                <li>✓ Standard CRA deduction: $0.67 per business kilometer</li>
                <li>✓ Monthly summaries track total business km and deductible amounts</li>
              </ul>
            </div>

            {/* CRA Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-gray-700">
              <p className="font-semibold mb-2">📋 CRA Compliance</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Keep detailed records of each trip (date, distance, destination, purpose)</li>
                <li>Log trips regularly - memory is fallible</li>
                <li>Standard deduction: $0.67 per business kilometer</li>
                <li>Claim deductible amount on Line 9270 of Form T2125</li>
                <li>Keep supporting records for at least 6 years</li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {saving ? 'Setting up...' : 'Start Tracking Mileage'}
              </button>
              <Link
                href="/"
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 text-center transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
