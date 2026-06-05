'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createAuthenticatedFetch, getAccessToken, getRefreshToken } from '@/lib/auth'

export default function NewMileageTripPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasBaseline, setHasBaseline] = useState(false)

  const [formData, setFormData] = useState({
    tripDate: new Date().toISOString().split('T')[0],
    kilometers: '',
    destination: '',
    businessPercentage: (() => {
      try {
        return parseInt(localStorage.getItem('lastBusinessPercentage') || '100')
      } catch {
        return 100
      }
    })(),
    notes: '',
  })

  // Check if baseline exists
  useEffect(() => {
    const checkBaseline = async () => {
      try {
        const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
        const response = await authenticatedFetch('/api/mileage/baseline')
        if (response.ok) {
          const data = await response.json()
          // Check if baseline exists - either via data.baseline property or data.id property
          const hasBaseline = !!(data.baseline || data.id)
          setHasBaseline(hasBaseline)
          if (!hasBaseline) {
            router.push('/mileage/setup')
          }
        } else {
          // If API returns non-ok, assume no baseline exists
          setHasBaseline(false)
          router.push('/mileage/setup')
        }
      } catch (err) {
        console.error('Error checking baseline:', err)
        setHasBaseline(false)
      } finally {
        setLoading(false)
      }
    }

    checkBaseline()
  }, [router])

  const calculateBusinessPercentage = (purpose: string): number => {
    switch (purpose) {
      case 'business':
        return 100
      case 'personal':
        return 0
      case 'mixed':
        return 50
      default:
        return 100
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    // Save business percentage to localStorage for persistence
    if (name === 'businessPercentage') {
      try {
        localStorage.setItem('lastBusinessPercentage', value)
      } catch (error) {
        console.error('Failed to save business percentage:', error)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch('/api/mileage/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripDate: formData.tripDate,
          kilometers: parseFloat(formData.kilometers),
          destination: formData.destination,
          businessPercentage: parseFloat(formData.businessPercentage.toString()),
          notes: formData.notes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create mileage trip')
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

  if (!hasBaseline) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-6">Please set up your vehicle baseline first.</p>
            <Link
              href="/mileage/setup"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition inline-block"
            >
              Set Up Vehicle Baseline
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Log Mileage Trip</h1>
          <p className="text-gray-600 mb-6">Record details of your business trip</p>

          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              Trip logged successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Trip Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="tripDate"
                value={formData.tripDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Kilometers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="kilometers"
                value={formData.kilometers}
                onChange={handleChange}
                required
                placeholder="e.g., 45.5"
                step="0.1"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Total kilometers driven for this trip</p>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                required
                placeholder="e.g., Client office in Toronto"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Business Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Use Percentage <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  name="businessPercentage"
                  value={formData.businessPercentage}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="1"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-center whitespace-nowrap">
                  <span className="text-2xl font-bold text-blue-600">{formData.businessPercentage}</span>
                  <span className="text-gray-600 font-medium">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">100% = all business trip, 50% = half business/half personal, 0% = personal trip</p>
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
                placeholder="e.g., Client meeting, lunch discussion included"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Deduction Preview */}
            {/* Info Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-gray-700">
              <p className="font-semibold mb-2">📋 CRA Requirements</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Record trip details as soon as possible</li>
                <li>Keep supporting documentation (invoices, meeting notes)</li>
                <li>Be consistent with business/personal classification</li>
                <li>CRA rates vary by year and distance thresholds</li>
                <li>Claim on Line 9270 of Form T2125</li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {saving ? 'Saving...' : 'Log Trip'}
              </button>
              <Link
                href="/mileage"
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
