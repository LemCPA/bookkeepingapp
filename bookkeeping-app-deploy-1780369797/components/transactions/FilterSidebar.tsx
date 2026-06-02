'use client'

import SearchBox from './SearchBox'
import { TransactionFilters } from '@/lib/filterUtils'
import { useEffect, useState } from 'react'

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
            style={{
              backgroundImage: 'none',
            }}
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
            style={{
              backgroundImage: 'none',
            }}
          />
        </div>
        <style>{`
          input[type="date"]::-webkit-calendar-picker-indicator {
            width: 12px !important;
            height: 12px !important;
            cursor: pointer;
            opacity: 0.5;
            margin-right: 2px;
            padding: 0 !important;
          }
          input[type="date"]::-webkit-outer-spin-button,
          input[type="date"]::-webkit-inner-spin-button {
            display: none;
          }
        `}</style>
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
