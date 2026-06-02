'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const mainLinks = [
    { href: '/receipts', label: 'Receipts' },
    { href: '/invoicing', label: 'Invoices' },
    { href: '/bulk-upload', label: 'Bulk Import' },
  ]

  const reportLinks = [
    { href: '/reports/balance-sheet', label: 'Balance Sheet' },
    { href: '/reports/income-statement', label: 'Income Statement' },
  ]

  const otherLinks = [
    { href: '/reconciliation', label: 'Reconciliation' },
    { href: '/gst-filing', label: 'GST Filing' },
    { href: '/pricing', label: 'Pricing' },
  ]

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex gap-2 flex-1 items-center overflow-x-auto">
        {mainLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-white hover:text-blue-200 transition font-medium text-xs sm:text-sm whitespace-nowrap px-1"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Mobile Hamburger Menu */}
      <div className="md:hidden flex-1">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white hover:text-blue-200 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-blue-700 shadow-lg">
          <div className="p-4 space-y-2">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 text-white hover:bg-blue-600 rounded"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-blue-600 my-2"></div>
            <div className="px-2 py-1 text-blue-200 text-sm font-semibold">Reports</div>
            {reportLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 text-white hover:bg-blue-600 rounded ml-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-blue-600 my-2"></div>
            <div className="px-2 py-1 text-blue-200 text-sm font-semibold">More</div>
            {otherLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 text-white hover:bg-blue-600 rounded ml-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
