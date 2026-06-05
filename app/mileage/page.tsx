'use client'

import { useEffect, useState } from 'react'
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

interface VehicleBaseline {
  id?: number
  odometerReading?: number
  setupDate?: string
  notes?: string
  createdAt?: string
  baseline?: any
}

// Helper function to parse date strings (YYYY-MM-DD) as local time, not UTC
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-')
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

export default function MileagePage() {
  const [trips, setTrips] = useState<MileageTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('mileageYear') || String(new Date().getFullYear()))
    } catch {
      return new Date().getFullYear()
    }
  })
  const [hasBaseline, setHasBaseline] = useState(false)
  const [baseline, setBaseline] = useState<VehicleBaseline | null>(null)
  const [baselineInput, setBaselineInput] = useState<string>('')
  const [savingBaseline, setSavingBaseline] = useState(false)
  const [sortColumn, setSortColumn] = useState<'date' | 'destination' | 'purpose' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    checkBaseline()
  }, [])

  // Save selected year to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('mileageYear', selectedYear.toString())
    } catch (error) {
      console.error('Failed to save mileage year to localStorage:', error)
    }
  }, [selectedYear])

  const checkBaseline = async () => {
    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch(`/api/mileage/baseline?year=${selectedYear}`)
      console.log('[checkBaseline] Response status:', response.status, 'year:', selectedYear)

      if (response.ok) {
        const data = await response.json()
        console.log('[checkBaseline] Data received:', data)

        // Check if baseline exists - either via data.baseline property or data.id property
        const baselineExists = !!(data.baseline || data.id)
        console.log('[checkBaseline] Baseline exists:', baselineExists)

        setHasBaseline(baselineExists)
        if (baselineExists) {
          setBaseline(data)
          fetchTrips()
        }
      } else {
        console.error('[checkBaseline] Response not ok:', response.status)
      }
    } catch (err) {
      console.error('Error checking baseline:', err)
    }
  }

  const fetchTrips = async () => {
    setLoading(true)
    setError(null)
    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch(`/api/mileage/trips?year=${selectedYear}`)
      if (!response.ok) throw new Error('Failed to fetch trips')
      const data = await response.json()
      setTrips(data.trips)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mileage trips')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // When year changes, check for baseline and fetch trips for that year
    checkBaseline()
  }, [selectedYear])

  // Refetch baseline and trips when page regains focus (e.g., returning from settings)
  useEffect(() => {
    const handleFocus = () => {
      checkBaseline()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const handleSaveBaseline = async () => {
    if (!baselineInput || isNaN(parseInt(baselineInput))) {
      alert('Please enter a valid odometer reading')
      return
    }

    setSavingBaseline(true)
    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch('/api/mileage/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odometerReading: parseInt(baselineInput),
          year: selectedYear,
        }),
      })

      if (response.ok) {
        setBaselineInput('')
        // Refresh baseline data
        checkBaseline()
      } else {
        alert('Failed to save baseline')
      }
    } catch (err) {
      console.error('Error saving baseline:', err)
      alert('Error saving baseline')
    } finally {
      setSavingBaseline(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this trip?')) return

    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch(`/api/mileage/trips/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete trip')
      setTrips(trips.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip')
    }
  }

  const handleSort = (column: 'date' | 'destination' | 'purpose') => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column and default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortedTrips = () => {
    if (!sortColumn) return trips

    const sorted = [...trips].sort((a, b) => {
      let compareValue = 0

      if (sortColumn === 'date') {
        compareValue = parseLocalDate(a.tripDate).getTime() - parseLocalDate(b.tripDate).getTime()
      } else if (sortColumn === 'destination') {
        compareValue = a.destination.localeCompare(b.destination)
      } else if (sortColumn === 'purpose') {
        compareValue = a.purpose.localeCompare(b.purpose)
      }

      return sortDirection === 'asc' ? compareValue : -compareValue
    })

    return sorted
  }

  const getSortIndicator = (column: 'date' | 'destination' | 'purpose') => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? ' ▲' : ' ▼'
  }

  // Calculate totals
  const totalTrips = trips.length
  const totalKm = trips.reduce((sum, t) => sum + t.kilometers, 0)
  const totalBusinessKm = trips.reduce((sum, t) => sum + t.businessKm, 0)
  const avgBusinessUse = trips.length > 0
    ? (trips.reduce((sum, t) => sum + t.businessPercentage, 0) / trips.length).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-gray-50 pt-12 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900">Mileage Tracking</h1>
            <Link
              href="/mileage/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              + Log Trip
            </Link>
          </div>
          <p className="text-gray-600">Track your business vehicle mileage for CRA deductions</p>
        </div>

        {/* Baseline Odometer, Year Selector, and CRA Rate - All in One Line */}
        <div className="mb-6 flex items-center gap-8 flex-wrap">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <label className="text-gray-700 font-medium text-sm">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Baseline Odometer Reading - Always Editable */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <label className="text-xs text-gray-600 uppercase tracking-wide">Beginning ODO:</label>
            <input
              type="number"
              value={baselineInput || (baseline?.odometerReading || 100000)}
              onChange={(e) => setBaselineInput(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-32 font-bold text-blue-600"
            />
            <button
              onClick={handleSaveBaseline}
              disabled={savingBaseline}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-xs font-medium whitespace-nowrap"
            >
              {savingBaseline ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600 text-xs mb-1 uppercase">Total Trips</p>
              <p className="text-3xl font-bold text-gray-900">{totalTrips}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600 text-xs mb-1 uppercase">Total Distance</p>
              <p className="text-3xl font-bold text-gray-900">{totalKm.toLocaleString()} <span className="text-lg">km</span></p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600 text-xs mb-1 uppercase">Business Distance</p>
              <p className="text-3xl font-bold text-blue-600">{totalBusinessKm.toLocaleString()} <span className="text-lg">km</span></p>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">Loading mileage trips...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">No mileage trips for {selectedYear}</p>
            <Link
              href="/mileage/new"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Log your first trip →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleSort('date')}
                    >
                      Date{getSortIndicator('date')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleSort('destination')}
                    >
                      Destination{getSortIndicator('destination')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleSort('purpose')}
                    >
                      Purpose{getSortIndicator('purpose')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Distance (km)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Business %</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">Business km</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getSortedTrips().map(trip => (
                    <tr key={trip.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {parseLocalDate(trip.tripDate).toLocaleDateString('en-CA')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{trip.destination}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">{trip.purpose}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{trip.kilometers.toLocaleString()} km</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{trip.businessPercentage.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{trip.businessKm.toLocaleString()} km</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Link
                            href={`/mileage/edit/${trip.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(trip.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CRA Info Box */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 CRA Mileage Deduction Requirements</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ Keep detailed records of each trip (date, distance, destination, purpose)</li>
            <li>✓ Document business use percentage (by trip purpose)</li>
            <li>✓ Track business kilometers - CRA rates vary by year and distance thresholds</li>
            <li>✓ Claim on Line 9270 of Form T2125 (Statement of Business Activities)</li>
            <li>✓ Keep supporting records and trip logs for at least 6 years</li>
            <li>✓ Vehicle must be used for income-earning purposes</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
