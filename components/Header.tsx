'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import UserMenu from './UserMenu'
import { getStoredUser } from '@/lib/auth'

type NavItem =
  | { href: string; label: string; icon?: string }
  | { label: string; icon: string; submenu: Array<{ href: string; label: string }> }

const authenticatedNavItems: NavItem[] = [
  { href: '/transactions', label: 'Transactions', icon: '📊' },
  { href: '/invoicing', label: 'Invoicing', icon: '📄' },
  { href: '/documents', label: 'Documents', icon: '📎' },
  { href: '/reconciliation', label: 'Reconciliation', icon: '✓' },
  { label: 'Reports', icon: '📈', submenu: [
    { href: '/reports/balance-sheet', label: 'Balance Sheet' },
    { href: '/reports/income-statement', label: 'Income Statement' },
    { href: '/reports/ar-aging', label: 'A/R Aging' },
    { href: '/reports/ap-aging', label: 'A/P Aging' },
    { href: '/reports/trends', label: 'Trends' },
    { href: '/reports/gst-filing', label: 'GST Filing' },
  ]},
  { href: '/recurring-transactions', label: 'Recurring', icon: '🔄' },
  { href: '/bulk-upload', label: 'Bulk Import', icon: '📥' },
  { href: '/settings/backup', label: 'Settings', icon: '⚙️' },
]

type SimpleNavItem = { href: string; label: string; icon?: string }

const unauthenticatedNavItems: SimpleNavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
]

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getStoredUser()
    setIsAuthenticated(!!user)
    setLoading(false)
  }, [])

  const navItems = isAuthenticated ? authenticatedNavItems : unauthenticatedNavItems

  if (loading) {
    return (
      <nav className="bg-blue-600 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold flex-shrink-0 hover:opacity-80 transition">
            Bookkeeping App
          </Link>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-blue-600 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold flex-shrink-0 hover:opacity-80 transition">
          Bookkeeping App
        </Link>

        {/* Desktop Navigation Menu */}
        <div className="hidden md:flex flex-1 justify-center items-center gap-1">
          {isAuthenticated ? (
            // Desktop menu for authenticated users
            authenticatedNavItems.map((item) => (
              'submenu' in item ? (
                <div key={item.label} className="relative group">
                  <button className="text-white hover:bg-blue-700 transition px-3 py-2 text-sm font-medium rounded flex items-center gap-1">
                    {item.icon} {item.label}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
                  {/* Submenu */}
                  <div className="absolute left-0 mt-0 w-48 bg-blue-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
                    {item.submenu.map((subitem) => (
                      <Link
                        key={subitem.href}
                        href={subitem.href}
                        className="block px-4 py-2 text-sm text-white hover:bg-blue-700 transition"
                      >
                        {subitem.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white hover:bg-blue-700 transition px-3 py-2 text-sm font-medium rounded flex items-center gap-1"
                >
                  {item.icon} {item.label}
                </Link>
              )
            ))
          ) : (
            // Desktop menu for unauthenticated users
            unauthenticatedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-white hover:bg-blue-700 transition px-3 py-2 text-sm font-medium rounded"
              >
                {item.label}
              </Link>
            ))
          )}
        </div>

        {/* Mobile Menu - Only for authenticated users, inline nav for guests */}
        {isAuthenticated ? (
          <div className="md:hidden flex-1">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:bg-blue-700 transition px-3 py-2 text-sm font-medium rounded"
            >
              ☰ Menu
            </button>
          </div>
        ) : (
          <div className="md:hidden flex-1 flex gap-1 justify-center">
            {unauthenticatedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-white hover:bg-blue-700 transition px-2 py-2 text-xs font-medium rounded"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {/* User Menu or Auth Links */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Link
                href="/login"
                className="text-white hover:bg-blue-700 transition px-3 py-2 text-sm font-medium rounded hidden sm:inline-block"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-white text-blue-600 hover:bg-gray-100 transition px-4 py-2 text-sm font-medium rounded"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-blue-700 border-t border-blue-500">
          <div className="max-w-7xl mx-auto px-4 py-2 space-y-0">
            {isAuthenticated ? (
              authenticatedNavItems.map((item) => (
                <div key={'submenu' in item ? item.label : item.href}>
                  {'submenu' in item ? (
                    <>
                      <button
                        onClick={() => setOpenSubmenu(openSubmenu === item.label ? null : item.label)}
                        className="w-full text-left text-white hover:bg-blue-600 transition px-4 py-1 text-sm font-medium rounded flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">{item.icon} {item.label}</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${openSubmenu === item.label ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>
                      {openSubmenu === item.label && (
                        <div className="bg-blue-600 rounded ml-4 mt-1">
                          {item.submenu.map((subitem) => (
                            <Link
                              key={subitem.href}
                              href={subitem.href}
                              className="block text-white hover:bg-blue-500 transition px-4 py-2 text-sm rounded"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {subitem.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className="block text-white hover:bg-blue-600 transition px-4 py-2 text-sm font-medium rounded flex items-center gap-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.icon} {item.label}
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-wrap gap-2">
                {unauthenticatedNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-white hover:bg-blue-600 transition px-3 py-1 text-sm font-medium rounded"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            {isAuthenticated && (
              <Link
                href="/login"
                className="block text-white hover:bg-blue-600 transition px-4 py-2 text-sm font-medium rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
