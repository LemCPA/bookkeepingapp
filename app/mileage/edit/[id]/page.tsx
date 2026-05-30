'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createAuthenticatedFetch, getAccessToken, getRefreshToken } from '@/lib/auth'

interface MileageTrip {
  id: number
  tripDate: string
  kilometers: number
  destination: string
  purpose: string
  businessPercentage: number
  businessKm: number
  deductibleAmount: number
  notes?: string
  createdAt: string
  updatedAt?: string
}

export default function EditMileageTripPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    tripDate: '',
    kilometers: '',
    destination: '',
    purpose: 'business',
    businessPercentage: 100,
    notes: '',
  })

  // Fetch the trip to edit
  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true)
      setError(null)
      try {
        const accessToken = getAccessToken()
        const refreshToken = getRefreshToken()
        console.log('[EDIT PAGE] Fetching trip:', id)
        console.log('[EDIT PAGE] Access token present:', !!accessToken)
        console.log('[EDIT PAGE] Access token length:', accessToken?.length)
        console.log('[EDIT PAGE] Refresh token present:', !!refreshToken)

        const authenticatedFetch = createAuthenticatedFetch(accessToken, refreshToken)
        console.log('[EDIT PAGE] Calling /api/mileage/trips/' + id)
        const response = await authenticatedFetch(`/api/mileage/trips/${id}`)
        console.log('[EDIT PAGE] Response status:', response.status)
        console.log('[EDIT PAGE] Response ok:', response.ok)

        if (!response.ok) {
          const errorData = await response.json()
          console.log('[EDIT PAGE] Error response:', errorData)
          throw new Error('Failed to load mileage trip')
        }
        const trip = await response.json()
        console.log('[EDIT PAGE] Trip data received:', trip)

        if (!trip || !trip.tripDate) {
          throw new Error('Invalid trip data received')
        }

        setFormData({
          tripDate: trip.tripDate,
          kilometers: trip.kilometers.toString(),
          destination: trip.destination,
          purpose: trip.purpose,
          businessPercentage: trip.businessPercentage,
          notes: trip.notes || '',
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trip')
        setTimeout(() => {
          router.push('/mileage')
        }, 2000)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchTrip()
    }
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      const response = await authenticatedFetch(`/api/mileage/trips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripDate: formData.tripDate,
          kilometers: parseFloat(formData.kilometers),
          destination: formData.destination,
          purpose: formData.purpose,
          businessPercentage: parseFloat(formData.businessPercentage.toString()),
          notes: formData.notes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update mileage trip')
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
            <p className="text-gray-600">Loading mileage trip...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Edit Mileage Trip</h1>
          <p className="text-gray-600 mb-6">Update your trip details</p>

          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              Trip updated successfully! Redirecting...
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

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Purpose <span className="text-red-500">*</span>
              </label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="business">Business</option>
                <option value="mixed">Mixed Business/Personal</option>
                <option value="personal">Personal</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Classify the type of trip</p>
            </div>

            {/* Business Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Percentage <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="businessPercentage"
                  value={formData.businessPercentage}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="1"
                  className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-medium"
                />
                <span className="text-gray-600 font-medium">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Use the ▲▼ arrows to adjust. Examples: 100 for all business, 50 for mixed, 0 for personal</p>
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
            {formData.kilometers && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">💰 Deduction Preview</h3>
                <p className="text-sm text-gray-700">
                  Business km: <span className="font-bold">{(parseFloat(formData.kilometers) * (formData.businessPercentage / 100)).toFixed(1)} km</span>
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Deductible amount: <span className="font-bold">${(parseFloat(formData.kilometers) * (formData.businessPercentage / 100) * 0.67).toFixed(2)}</span> @ $0.67/km
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-gray-700">
              <p className="font-semibold mb-2">📋 CRA Requirements</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Record trip details as soon as possible</li>
                <li>Keep supporting documentation (invoices, meeting notes)</li>
                <li>Be consistent with business/personal classification</li>
                <li>Standard deduction: $0.67 per business kilometer</li>
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
                {saving ? 'Saving...' : 'Save Changes'}
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
