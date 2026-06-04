import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

export interface TransactionFilters {
  dateFrom?: string
  dateTo?: string
  types?: string[]
  clientIds?: number[]
  search?: string
  sortBy?: 'date' | 'amount'
  sortOrder?: 'asc' | 'desc'
  month?: string // for backward compatibility with old month filter
}

/**
 * Build query string from filters object
 * Handles array parameters correctly for Next.js URL API
 */
export function buildQueryString(filters: TransactionFilters): string {
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
  return queryString ? `?${queryString}` : ''
}

/**
 * Parse filters from URL search params
 */
export function parseFiltersFromUrl(searchParams: URLSearchParams): TransactionFilters {
  const filters: TransactionFilters = {}

  const dateFrom = searchParams.get('dateFrom')
  if (dateFrom) filters.dateFrom = dateFrom

  const dateTo = searchParams.get('dateTo')
  if (dateTo) filters.dateTo = dateTo

  const search = searchParams.get('search')
  if (search) filters.search = search

  const sortBy = searchParams.get('sortBy')
  if (sortBy === 'amount' || sortBy === 'date') filters.sortBy = sortBy

  const sortOrder = searchParams.get('sortOrder')
  if (sortOrder === 'asc' || sortOrder === 'desc') filters.sortOrder = sortOrder

  const month = searchParams.get('month')
  if (month) filters.month = month

  // Parse array parameters
  const types = searchParams.getAll('type')
  if (types.length > 0) filters.types = types

  const clientIds = searchParams.getAll('clientIds')
  if (clientIds.length > 0) filters.clientIds = clientIds.map(id => parseInt(id))

  return filters
}

/**
 * Hook to manage transaction filters via URL search params
 * Returns current filters and functions to update them
 */
export function useTransactionFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [mounted, setMounted] = useState(false)

  // Initialize filters from URL on mount, with localStorage fallback
  useEffect(() => {
    const parsedFilters = parseFiltersFromUrl(searchParams)

    // If no URL params, try to load from localStorage
    if (Object.keys(parsedFilters).length === 0) {
      try {
        const savedFilters = localStorage.getItem('transactionFilters')
        if (savedFilters) {
          const loadedFilters = JSON.parse(savedFilters)
          setFilters(loadedFilters)
          setMounted(true)
          return
        }
      } catch (error) {
        console.error('Failed to load filters from localStorage:', error)
      }
    }

    setFilters(parsedFilters)
    setMounted(true)
  }, [searchParams])

  // Update URL when filters change (but not on initial mount)
  const updateFilters = useCallback(
    (newFilters: TransactionFilters) => {
      setFilters(newFilters)
      // Save to localStorage for persistence
      try {
        localStorage.setItem('transactionFilters', JSON.stringify(newFilters))
      } catch (error) {
        console.error('Failed to save filters to localStorage:', error)
      }
      if (mounted) {
        const queryString = buildQueryString(newFilters)
        router.push(`/transactions${queryString}`)
      }
    },
    [router, mounted]
  )

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({})
    // Clear from localStorage too
    try {
      localStorage.removeItem('transactionFilters')
    } catch (error) {
      console.error('Failed to clear filters from localStorage:', error)
    }
    if (mounted) {
      router.push('/transactions')
    }
  }, [router, mounted])

  // Update individual filter fields
  const setDateRange = useCallback(
    (dateFrom?: string, dateTo?: string) => {
      const newFilters = { ...filters, dateFrom, dateTo }
      setFilters(newFilters)
      if (mounted) {
        const queryString = buildQueryString(newFilters)
        router.push(`/transactions${queryString}`)
      }
    },
    [filters, router, mounted]
  )

  const setSearchText = useCallback(
    (search?: string) => {
      const newFilters = { ...filters, search }
      setFilters(newFilters)
      if (mounted) {
        const queryString = buildQueryString(newFilters)
        router.push(`/transactions${queryString}`)
      }
    },
    [filters, router, mounted]
  )

  const setTypes = useCallback(
    (types?: string[]) => {
      const newFilters = { ...filters, types: types && types.length > 0 ? types : undefined }
      setFilters(newFilters)
      if (mounted) {
        const queryString = buildQueryString(newFilters)
        router.push(`/transactions${queryString}`)
      }
    },
    [filters, router, mounted]
  )

  const setClients = useCallback(
    (clientIds?: number[]) => {
      const newFilters = { ...filters, clientIds: clientIds && clientIds.length > 0 ? clientIds : undefined }
      setFilters(newFilters)
      if (mounted) {
        const queryString = buildQueryString(newFilters)
        router.push(`/transactions${queryString}`)
      }
    },
    [filters, router, mounted]
  )

  const setSorting = useCallback(
    (sortBy?: 'date' | 'amount', sortOrder?: 'asc' | 'desc') => {
      const newFilters = { ...filters, sortBy, sortOrder }
      setFilters(newFilters)
      if (mounted) {
        const queryString = buildQueryString(newFilters)
        router.push(`/transactions${queryString}`)
      }
    },
    [filters, router, mounted]
  )

  return {
    filters,
    updateFilters,
    clearFilters,
    setDateRange,
    setSearchText,
    setTypes,
    setClients,
    setSorting,
  }
}
