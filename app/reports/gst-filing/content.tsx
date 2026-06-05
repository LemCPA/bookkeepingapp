'use client'

import { useEffect, useState } from 'react'
import { createAuthenticatedFetch } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { shouldShowGstFiling } from '@/lib/gst-utils'

interface GstFilingData {
  clientName: string
  gstNumber: string
  month: string
  gstCollected: number
  gstPaid: number
  netGst: number
  owingOrRefundable: string
  amount: number
}

interface HomeExpensesInfo {
  deductibleAmount: number
  itcAmount: number
  totalGst: number
}

interface VehicleExpensesInfo {
  deductibleAmount: number
  itcAmount: number
  totalGst: number
}

export default function GstFilingContent() {
  const currentYear = new Date().getFullYear()

  // Check if user is registered for GST
  const [gstRegistered, setGstRegistered] = useState(true) // Default to registered
  const [checkingGstStatus, setCheckingGstStatus] = useState(true)

  // Initialize from localStorage, fallback to current values
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    try {
      return localStorage.getItem('gstFilingYear') || String(currentYear)
    } catch {
      return String(currentYear)
    }
  })

  const [startMonthNum, setStartMonthNum] = useState<string>(() => {
    try {
      return localStorage.getItem('gstFilingStartMonth') || '01'
    } catch {
      return '01'
    }
  })

  const [endMonthNum, setEndMonthNum] = useState<string>(() => {
    try {
      return localStorage.getItem('gstFilingEndMonth') || '12'
    } catch {
      return '12'
    }
  })

  const [filingData, setFilingData] = useState<GstFilingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // State for business use expenses and tax credits
  const [homeExpensesData, setHomeExpensesData] = useState<HomeExpensesInfo | null>(null)
  const [vehicleExpensesData, setVehicleExpensesData] = useState<VehicleExpensesInfo | null>(null)

  // Fetch user's GST registration status
  useEffect(() => {
    const fetchGstStatus = async () => {
      try {
        const authenticatedFetch = createAuthenticatedFetch()
        const response = await authenticatedFetch('/api/user/settings')
        if (response.ok) {
          const settings = await response.json()
          if (settings.gst_registered !== undefined) {
            setGstRegistered(settings.gst_registered)
          }
        }
      } catch (error) {
        console.error('Failed to fetch GST registration status:', error)
      } finally {
        setCheckingGstStatus(false)
      }
    }
    fetchGstStatus()
  }, [])

  // Save selections to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('gstFilingYear', selectedYear)
      localStorage.setItem('gstFilingStartMonth', startMonthNum)
      localStorage.setItem('gstFilingEndMonth', endMonthNum)
    } catch (error) {
      console.error('Failed to save GST filing preferences:', error)
    }
  }, [selectedYear, startMonthNum, endMonthNum])

  useEffect(() => {
    const startOfYear = `${selectedYear}-01`
    const endOfYear = `${selectedYear}-12`
    fetchGstData(startOfYear, endOfYear)
    setLoaded(true)
  }, [])

  // Watch for date changes and fetch data
  useEffect(() => {
    if (loaded) {
      const startStr = `${selectedYear}-${startMonthNum}`
      const endStr = `${selectedYear}-${endMonthNum}`
      if (startStr && endStr) {
        fetchGstData(startStr, endStr)
      }
    }
  }, [selectedYear, startMonthNum, endMonthNum, loaded])

  // Detect when page becomes visible and refresh data with current percentages
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && loaded) {
        // Page became visible, refresh data with current percentages
        const startStr = `${selectedYear}-${startMonthNum}`
        const endStr = `${selectedYear}-${endMonthNum}`
        if (startStr && endStr) {
          fetchGstData(startStr, endStr)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [selectedYear, startMonthNum, endMonthNum, loaded])

  // Show loading while checking GST status
  if (checkingGstStatus) {
    return (
      <div className="text-center py-8">Loading GST status...</div>
    )
  }

  // If user is not GST-registered, show message instead of filing form
  if (!gstRegistered) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">GST/HST Filing Not Available</h2>
          <p className="text-blue-800 mb-4">
            Your account is not registered for GST/HST. GST filing is only available for registered businesses.
          </p>
          <p className="text-sm text-blue-700">
            If you've become GST-registered, please update your <a href="/settings" className="underline font-medium hover:text-blue-900">account settings</a>.
          </p>
        </div>
      </div>
    )
  }

  async function fetchGstData(start: string, end: string) {
    if (!start || !end) return

    try {
      setLoading(true)
      setError(null)

      // Get current percentages from localStorage to ensure consistency
      const homePercentage = parseInt(localStorage.getItem('homeBusinessUsePercentage') || '100')
      const vehiclePercentage = parseInt(localStorage.getItem('vehicleBusinessUsePercentage') || '100')

      const authenticatedFetch = createAuthenticatedFetch()
      const url = `/api/reports/gst-filing?startMonth=${start}&endMonth=${end}`
      const response = await authenticatedFetch(url)
      if (response.ok) {
        const data = await response.json()
        setFilingData(data)
        setError(null)
      } else if (response.status === 404) {
        setFilingData(null)
        setError('No GST/HST registration found. Please ensure your business is GST/HST registered.')
      } else {
        const errorData = await response.json()
        setFilingData(null)
        setError(errorData.error || 'Failed to load GST filing data')
      }

      // Fetch home expenses data with current percentages
      try {
        const homeResponse = await authenticatedFetch(
          `/api/reports/home-expenses?startMonth=${start}&endMonth=${end}&homePercentage=${homePercentage}`
        )
        if (homeResponse.ok) {
          const homeData = await homeResponse.json()
          // Backend now calculates deductible amounts with percentages applied
          setHomeExpensesData({
            deductibleAmount: homeData.deductibleAmount || 0,
            itcAmount: homeData.deductibleGst || 0,
            totalGst: homeData.totalGst,
          })
        }
      } catch (err) {
        console.error('Failed to fetch home expenses data:', err)
      }

      // Fetch vehicle expenses data with current percentages
      try {
        const vehicleResponse = await authenticatedFetch(
          `/api/reports/vehicle-expenses?startMonth=${start}&endMonth=${end}&vehiclePercentage=${vehiclePercentage}`
        )
        if (vehicleResponse.ok) {
          const vehicleData = await vehicleResponse.json()
          // Backend now calculates deductible amounts with percentages applied
          setVehicleExpensesData({
            deductibleAmount: vehicleData.deductibleAmount || 0,
            itcAmount: vehicleData.deductibleGst || 0,
            totalGst: vehicleData.totalGst,
          })
        }
      } catch (err) {
        console.error('Failed to fetch vehicle expenses data:', err)
      }
    } catch (error: any) {
      console.error('Error fetching GST filing data:', error)
      setFilingData(null)
      setError('Error loading GST filing data')
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  const handleDateChange = () => {
    const startStr = `${selectedYear}-${startMonthNum}`
    const endStr = `${selectedYear}-${endMonthNum}`
    if (startStr && endStr) {
      fetchGstData(startStr, endStr)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading GST filing data...</div>
  }

  if (error || !filingData) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6">GST/HST Filing</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
          {error || 'No GST/HST filing data available for the selected period.'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-6">
      <div className="mt-6">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">GST/HST Filing</h1>
        <div className="text-gray-600 space-y-1">
          <p><strong>Client:</strong> {filingData.clientName}</p>
          <p><strong>GST/HST Number:</strong> {filingData.gstNumber || 'Not provided'}</p>
          <p><strong>Period:</strong> {selectedYear}-{startMonthNum} to {selectedYear}-{endMonthNum}</p>
        </div>
      </div>

      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Month</label>
          <select
            value={startMonthNum}
            onChange={(e) => setStartMonthNum(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Month</label>
          <select
            value={endMonthNum}
            onChange={(e) => setEndMonthNum(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GST Collected */}
        <div className="bg-blue-50 rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">GST/HST Collected</h2>
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {formatCurrency(filingData.gstCollected)}
          </div>
          <p className="text-sm text-blue-700">
            Tax collected on invoices (output tax)
          </p>
        </div>

        {/* GST Paid */}
        <div className="bg-green-50 rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <h2 className="text-lg font-semibold text-green-900 mb-2">GST/HST Paid (Input Tax Credits)</h2>
          <div className="text-4xl font-bold text-green-600 mb-2">
            {formatCurrency(filingData.gstPaid)}
          </div>
          <p className="text-sm text-green-700">
            Total claimable input tax credits (home & vehicle adjusted for business use %)
          </p>
        </div>
      </div>

      {/* Net GST Owing or Refundable */}
      <div
        className={`rounded-lg shadow-md p-4 ${
          filingData.netGst > 0
            ? 'bg-red-50 border-l-4 border-red-500'
            : 'bg-purple-50 border-l-4 border-purple-500'
        }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <h2
              className={`text-2xl font-semibold mb-2 ${
                filingData.netGst > 0 ? 'text-red-900' : 'text-purple-900'
              }`}
            >
              {filingData.owingOrRefundable === 'Owing'
                ? 'GST/HST Owing to CRA'
                : 'GST/HST Refund Due'}
            </h2>
            <div
              className={`text-5xl font-bold mb-2 ${
                filingData.netGst > 0 ? 'text-red-600' : 'text-purple-600'
              }`}
            >
              {formatCurrency(filingData.amount)}
            </div>
          </div>
          <div className="text-right text-sm">
            {filingData.netGst > 0 ? (
              <div className="bg-red-100 text-red-800 px-4 py-2 rounded font-medium">
                PAYMENT DUE
              </div>
            ) : (
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded font-medium">
                REFUND ELIGIBLE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calculation Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-2">Calculation Breakdown</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-gray-700 pb-2 border-b">
            <span>GST/HST Collected (Output Tax)</span>
            <span className="font-medium">{formatCurrency(filingData.gstCollected)}</span>
          </div>
          <div className="flex justify-between text-gray-700 pb-2 border-b">
            <span>Less: GST/HST Paid (Input Tax Credits)</span>
            <span className="font-medium">({formatCurrency(filingData.gstPaid)})</span>
          </div>
          <div className="flex justify-between text-lg font-bold bg-gray-50 p-3 rounded">
            <span>Net GST/HST Position</span>
            <span
              className={filingData.netGst > 0 ? 'text-red-600' : 'text-green-600'}
            >
              {filingData.netGst > 0 ? '+' : '-'}
              {formatCurrency(filingData.amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Input Tax Credits */}
      {(homeExpensesData || vehicleExpensesData) && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-2">Input Tax Credits</h3>
          <div className="space-y-3">
            {homeExpensesData && (
              <div className="flex justify-between text-gray-700 pb-2 border-b bg-blue-50 p-2 rounded">
                <span className="text-blue-900">Home Expense Business Tax Credit (ITC)</span>
                <span className="font-medium text-blue-900">{formatCurrency(homeExpensesData.itcAmount)}</span>
              </div>
            )}
            {vehicleExpensesData && (
              <div className="flex justify-between text-gray-700 pb-2 border-b bg-blue-50 p-2 rounded">
                <span className="text-blue-900">Motor Vehicle Tax Credit (ITC)</span>
                <span className="font-medium text-blue-900">{formatCurrency(vehicleExpensesData.itcAmount)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filing Instructions */}
      <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400">
        <h3 className="font-semibold text-yellow-900 mb-2">Important Notes</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• This report is for reference only. Please verify with official CRA records.</li>
          <li>• Filing deadlines and remittance due dates depend on your filing frequency.</li>
          <li>• Consult with a tax professional for accurate GST/HST compliance.</li>
          <li>• Keep all supporting documentation (invoices, receipts) for audit purposes.</li>
        </ul>
      </div>

      {/* Footer Links */}
      <div className="border-t border-gray-200 mt-12 py-6 text-center text-sm text-gray-600">
        <p>
          <a href="/terms" className="hover:text-blue-600 font-medium">Terms of Use</a>
          {' '} | {' '}
          <a href="/disclaimer" className="hover:text-blue-600 font-medium">Disclaimer</a>
        </p>
      </div>
    </div>
  )
}
