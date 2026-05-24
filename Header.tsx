'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import UserMenu from './UserMenu'
import { getStoredUser } from '@/lib/auth'
import { useChatState } from '@/lib/ChatContext'

type NavItem =
  | { href: string; label: string; icon?: string }
  | { label: string; icon: string; submenu: Array<{ href: string; label: string }> }

const authenticatedNavItems: NavItem[] = [
  { href: '/receipts', label: 'Snap Receipt', icon: '📷' },
  { href: '/transactions', label: 'Transactions', icon: '📋' },
  { href: '/invoicing', label: 'Invoices', icon: '📄' },
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
  { label: 'Settings', icon: '⚙️', submenu: [
    { href: '/settings/gst', label: 'Default GST/HST' },
    { href: '/settings/accounts', label: 'Chart of Accounts' },
  ]},
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
  const { setIsOpen: setChatOpen } = useChatState()

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
        <div className="hidden lg:flex flex-1 justify-center items-center gap-1">
          {isAuthenticated ? (
            // Desktop menu for authenticated users
            authenticatedNavItems.map((item) => (
              'submenu' in item ? (
                <Link
                  key={item.label}
                  href="/reports/balance-sheet"
                  className="text-white hover:bg-blue-700 transition px-3 py-2 text-sm font-medium rounded flex items-center gap-1"
                >
                  {item.icon} {item.label}
                </Link>
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
          <div className="lg:hidden flex-1">
            <button
              onClick={() => {
                if (isMobileMenuOpen) {
                  // Closing menu
                  setIsMobileMenuOpen(false)
                  setOpenSubmenu(null)
                } else {
                  // Opening menu - keep submenu collapsed
                  setIsMobileMenuOpen(true)
                  setOpenSubmenu(null)
                }
              }}
              className="text-white hover:bg-blue-700 transition px-3 py-2 text-sm font-medium rounded"
            >
              ☰ Menu
            </button>
          </div>
        ) : (
          <div className="lg:hidden flex-1 flex gap-1 justify-center">
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
          {isAuthenticated && (
            <button
              onClick={() => setChatOpen(true)}
              className="text-white hover:bg-blue-700 transition px-3 py-2 text-sm font-medium rounded"
              title="Open chat assistant"
              style={{ display: 'inline-block' }}
            >
              💬 Get Help
            </button>
          )}
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
        <div className="lg:hidden bg-blue-700 border-t border-blue-500 relative z-50">
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap gap-1 items-center">
            {isAuthenticated ? (
              authenticatedNavItems.map((item) => (
                <div
                  key={'submenu' in item ? item.label : item.href}
                  className={'submenu' in item ? 'relative' : ''}
                  onMouseLeave={() => {'submenu' in item && setOpenSubmenu(null)}}
                >
                  {'submenu' in item ? (
                    <>
                      <button
                        onClick={() => setOpenSubmenu(item.label)}
                        onMouseEnter={() => setOpenSubmenu(item.label)}
                        className="text-white hover:bg-blue-600 transition px-2 py-1 text-xs font-medium rounded flex items-center gap-1"
                      >
                        <span className="flex items-center gap-1">{item.icon} {item.label}</span>
                        <svg
                          className={`w-3 h-3 transition-transform ${openSubmenu === item.label ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>
                      {openSubmenu === item.label && (
                        <div className="absolute left-0 top-full mt-1 w-48 bg-gray-200 rounded-lg shadow-2xl py-2 z-[9999] border border-gray-300">
                          {item.submenu.map((subitem) => (
                            <Link
                              key={subitem.href}
                              href={subitem.href}
                              className="block text-gray-800 hover:bg-gray-700 hover:text-white transition px-4 py-2 text-sm rounded"
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
                      className="text-white hover:bg-blue-600 transition px-2 py-1 text-xs font-medium rounded flex items-center gap-1"
                    >
                      {item.icon} {item.label}
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-wrap gap-1">
                {unauthenticatedNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-white hover:bg-blue-600 transition px-2 py-1 text-xs font-medium rounded"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            {isAuthenticated && (
              <Link
                href="/login"
                className="text-white hover:bg-blue-600 transition px-2 py-1 text-xs font-medium rounded"
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
