'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createAuthenticatedFetch, getStoredUser } from '@/lib/auth'

interface Account {
  id: number
  code: string
  name: string
  type: string
}

function ConfirmReceiptContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [notLoggedIn, setNotLoggedIn] = useState(false)

  // Extracted data from query params
  const [date, setDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState(parseFloat(searchParams.get('amount') || '0'))
  const [description, setDescription] = useState(searchParams.get('description') || '')
  const [vendorName, setVendorName] = useState(searchParams.get('vendor_name') || '')
  const [type, setType] = useState<'RECEIPT' | 'INVOICE' | 'ADJUSTMENT'>(
    (searchParams.get('type') as 'RECEIPT' | 'INVOICE' | 'ADJUSTMENT') || 'RECEIPT'
  )
  const [gstHstRate, setGstHstRate] = useState<number | undefined>(
    searchParams.get('gst_hst_rate') ? parseFloat(searchParams.get('gst_hst_rate')!) : undefined
  )
  const [gstHstAmount, setGstHstAmount] = useState<number | undefined>(
    searchParams.get('gst_hst_amount') ? parseFloat(searchParams.get('gst_hst_amount')!) : undefined
  )

  // Form fields
  const [accountId, setAccountId] = useState<number>(0)
  const [referenceNumber, setReferenceNumber] = useState('')

  // Data
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedUser = getStoredUser()
    if (!storedUser) {
      setNotLoggedIn(true)
      return
    }

    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const authenticatedFetch = createAuthenticatedFetch()

      // Fetch accounts
      const accountsResponse = await authenticatedFetch('/api/chart-of-accounts')
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setAccounts(accountsData)
        // Set default account to first expense account
        const defaultAccount = accountsData.find((a: Account) => a.type === 'EXPENSE')
        if (defaultAccount) {
          setAccountId(defaultAccount.id)
        }
      }

    } catch (err) {
      setError('Failed to load form data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!accountId) {
      setError('Please select an account')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const authenticatedFetch = createAuthenticatedFetch()

      // Create transaction
      const transactionResponse = await authenticatedFetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: accountId,
          transaction_date: date,
          amount,
          description: description || vendorName,
          type,
          reference_number: referenceNumber || null,
          gst_hst_rate: gstHstRate || null,
          gst_hst_amount: gstHstAmount || null,
        }),
      })

      if (!transactionResponse.ok) {
        throw new Error('Failed to save receipt')
      }

      // Success - redirect to receipts page
      router.push('/receipts?success=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save receipt')
    } finally {
      setSaving(false)
    }
  }

  if (notLoggedIn) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Confirm Receipt</h1>
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">Please log in to save receipts</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Confirm Receipt</h1>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Confirm Receipt</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>
      </div>

      <div className="max-w-2xl">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receipt Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account <span className="text-red-500">*</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Select an account...</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vendor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor/Merchant
            </label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g., Staples, Coffee Shop"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What was purchased? (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* GST/HST */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST/HST Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={gstHstRate || ''}
                onChange={(e) =>
                  setGstHstRate(e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST/HST Amount
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={gstHstAmount || ''}
                  onChange={(e) =>
                    setGstHstAmount(e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="0"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g., REC-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => router.back()}
              className="flex-1 bg-gray-300 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-400 font-medium"
            >
              ← Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !accountId}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
            >
              {saving ? 'Saving...' : '✓ Save Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmReceiptPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ConfirmReceiptContent />
    </Suspense>
  )
}
