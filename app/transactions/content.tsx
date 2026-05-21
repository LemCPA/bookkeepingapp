'use client'

import { useEffect, useState } from 'react'
import FilterSidebar from '@/components/transactions/FilterSidebar'
import TransactionsTable from '@/components/transactions/TransactionsTable'
import { useTransactionFilters } from '@/lib/filterUtils'
import { createAuthenticatedFetch, getStoredUser } from '@/lib/auth'

interface Transaction {
  id: number
  client_name: string
  account_name: string
  transaction_date: string
  amount: number
  gst_hst_rate?: number
  gst_hst_amount?: number
  description: string
  type: string
}

export default function TransactionsContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const {
    filters,
    updateFilters,
    clearFilters,
    setSearchText,
  } = useTransactionFilters()

  // Check if user is logged in on mount
  useEffect(() => {
    const storedUser = getStoredUser()
    setUser(storedUser)
    if (!storedUser) {
      setError('Please log in to view transactions')
      setLoading(false)
    }
  }, [])

  // Fetch transactions whenever filters change
  useEffect(() => {
    fetchTransactions()
  }, [filters])

  async function fetchTransactions() {
    if (!user) {
      return
    }

    setLoading(true)
    try {
      // Build query string from current filters
      const params = new URLSearchParams()

      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.search) params.append('search', filters.search)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
      if (filters.month) params.append('month', filters.month)

      // Add array parameters
      if (filters.types && filters.types.length > 0) {
        filters.types.forEach(type => params.append('type', type))
      }
      if (filters.clientIds && filters.clientIds.length > 0) {
        filters.clientIds.forEach(id => params.append('clientIds', id.toString()))
      }

      const queryString = params.toString()
      const url = `/api/transactions${queryString ? '?' + queryString : ''}`

      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch(url)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSortChange = (sortBy: 'date' | 'amount') => {
    const newSortOrder =
      filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc'

    updateFilters({
      ...filters,
      sortBy,
      sortOrder: newSortOrder,
    })
  }

  if (error && !user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">{error}</p>
          <p className="text-blue-700 text-sm mt-2">Please use the Sign In button in the top right corner to log in.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <a
          href="/transactions/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          New Transaction
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <FilterSidebar
            filters={filters}
            onFiltersChange={updateFilters}
            onClearFilters={clearFilters}
            onSearch={setSearchText}
          />
        </div>

        {/* Main Content */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <TransactionsTable
              transactions={transactions}
              filters={filters}
              loading={loading}
              onSortChange={handleSortChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
