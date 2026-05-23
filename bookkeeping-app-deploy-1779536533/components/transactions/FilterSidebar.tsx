'use client'

import SearchBox from './SearchBox'
import { TransactionFilters } from '@/lib/filterUtils'
import { useEffect, useState } from 'react'

interface Client {
  id: number
  name: string
}

interface FilterSidebarProps {
  filters: TransactionFilters
  onFiltersChange: (filters: TransactionFilters) => void
  onClearFilters: () => void
  onSearch: (search: string | undefined) => void
}

export default function FilterSidebar({
  filters,
  onFiltersChange,
  onClearFilters,
  onSearch,
}: FilterSidebarProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)

  // Fetch clients for the dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients')
        if (response.ok) {
          const data = await response.json()
          setClients(data)
        }
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setLoadingClients(false)
      }
    }

    fetchClients()
  }, [])

  const handleTypeChange = (type: string, checked: boolean) => {
    const currentTypes = filters.types || []
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type)

    onFiltersChange({
      ...filters,
      types: newTypes.length > 0 ? newTypes : undefined,
    })
  }

  const handleClientChange = (clientId: number, checked: boolean) => {
    const currentClientIds = filters.clientIds || []
    const newClientIds = checked
      ? [...currentClientIds, clientId]
      : currentClientIds.filter(id => id !== clientId)

    onFiltersChange({
      ...filters,
      clientIds: newClientIds.length > 0 ? newClientIds : undefined,
    })
  }

  const handleSortChange = (sortBy: 'date' | 'amount') => {
    const newSortOrder =
      filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc'

    onFiltersChange({
      ...filters,
      sortBy,
      sortOrder: newSortOrder,
    })
  }

  return (
    <div className="w-full md:w-80 bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Filters</h2>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search
        </label>
        <SearchBox
          placeholder="Search description..."
          initialValue={filters.search || ''}
          onSearchChange={onSearch}
        />
      </div>

      {/* Client Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Client
        </label>
        {loadingClients ? (
          <p className="text-sm text-gray-500">Loading clients...</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {clients.length === 0 ? (
              <p className="text-sm text-gray-500">No clients found</p>
            ) : (
              clients.map(client => (
                <label key={client.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.clientIds?.includes(client.id) || false}
                    onChange={e => handleClientChange(client.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-700">{client.name}</span>
                </label>
              ))
            )}
          </div>
        )}
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Date Range
        </label>
        <div className="space-y-2">
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={e => {
              onFiltersChange({
                ...filters,
                dateFrom: e.target.value || undefined,
              })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={e => {
              onFiltersChange({
                ...filters,
                dateTo: e.target.value || undefined,
              })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Transaction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Transaction Type
        </label>
        <div className="space-y-2">
          {['INVOICE', 'RECEIPT', 'ADJUSTMENT'].map(type => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.types?.includes(type) || false}
                onChange={e => handleTypeChange(type, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sorting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Sort By
        </label>
        <div className="space-y-2">
          <button
            onClick={() => handleSortChange('date')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.sortBy === 'date' || !filters.sortBy
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Date {filters.sortBy === 'date' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => handleSortChange('amount')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.sortBy === 'amount'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Amount {filters.sortBy === 'amount' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
          </button>
        </div>
      </div>

      {/* Clear Filters Button */}
      <button
        onClick={onClearFilters}
        className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
      >
        Clear All Filters
      </button>
    </div>
  )
}
