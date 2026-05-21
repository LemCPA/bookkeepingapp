'use client'

import { useState } from 'react'
import Link from 'next/link'
import UserMenu from './UserMenu'

const navigationItems = [
  { href: '/transactions', label: 'Transactions' },
  { href: '/invoicing', label: 'Invoicing' },
  { href: '/documents', label: 'Documents' },
  { href: '/bulk-upload', label: 'Bulk Import' },
  { href: '/reports/balance-sheet', label: 'Balance Sheet' },
  { href: '/reports/income-statement', label: 'Income Statement' },
  { href: '/reports/ar-aging', label: 'A/R Aging' },
  { href: '/reports/ap-aging', label: 'A/P Aging' },
  { href: '/reports/trends', label: 'Trends' },
  { href: '/reconciliation', label: 'Reconciliation' },
  { href: '/recurring-transactions', label: 'Recurring' },
  { href: '/reports/gst-filing', label: 'GST Filing' },
  { href: '/settings/backup', label: 'Backup' },
]

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-blue-600 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <h1 className="text-lg font-bold flex-shrink-0">
          <a href="/">Bookkeeping App</a>
        </h1>

        {/* Menu Button - Centered on all screen sizes */}
        <div className="flex-1 flex justify-center">
          <div className="relative inline-block">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:bg-blue-700 transition px-4 py-2 text-sm font-medium flex items-center gap-2"
            >
              ☰ Menu
              <svg
                className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-blue-800 shadow-2xl z-50 border border-blue-500 w-56 min-w-max">
                {navigationItems.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block w-full text-left text-white hover:bg-blue-600 transition px-4 py-2 text-sm ${
                      index === 0 ? 'rounded-t' : ''
                    } ${index === navigationItems.length - 1 ? 'rounded-b' : ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Menu - Always visible */}
        <div className="flex-shrink-0">
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
