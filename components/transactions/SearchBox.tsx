'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'

interface SearchBoxProps {
  placeholder?: string
  onSearchChange: (search: string | undefined) => void
  initialValue?: string
}

export default function SearchBox({
  placeholder = 'Search transactions...',
  onSearchChange,
  initialValue = '',
}: SearchBoxProps) {
  const [search, setSearch] = useState(initialValue)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search callback
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for debounced search
    timeoutRef.current = setTimeout(() => {
      onSearchChange(value || undefined)
    }, 300)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={handleChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <svg
        className="absolute right-3 top-2.5 w-5 h-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  )
}
