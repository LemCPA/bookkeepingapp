'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import UserMenu from './UserMenu'
import { getStoredUser, clearAuth } from '@/lib/auth'
import { useChatState } from '@/lib/ChatContext'

type NavItem =
  | { href: string; label: string; icon?: string }
  | { label: string; icon: string; submenu: Array<{ href: string; label: string }> }

const authenticatedNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/invoicing', label: 'Invoices' },
  { href: '/receipts', label: 'Snap Document' },
  { href: '/transactions', label: 'Transactions' },
  { label: 'Reports', icon: '📊', submenu: [
    { href: '/reports/income-statement', label: 'Income Statement' },
    { href: '/reports/expense-categories', label: 'Expenses by Category' },
    { href: '/reports/vehicle-expenses', label: 'Vehicle Expenses' },
    { href: '/reports/home-expenses', label: 'Home Expenses' },
    { href: '/reports/gst-filing', label: 'GST Filing' },
  ]},
  { href: '/mileage', label: 'Mileage' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/billing', label: 'Billing' },
  { label: 'Settings', icon: '⚙️', submenu: [
    { href: '/settings/profile', label: 'Business Profile' },
    { href: '/settings/gst', label: 'Default GST/HST' },
    { href: '/settings/accounts', label: 'Chart of Accounts' },
  ]},
]

type SimpleNavItem = { href: string; label: string; icon?: string }

const unauthenticatedNavItems: SimpleNavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isLargeScreen, setIsLargeScreen] = useState(true)
  const { setIsOpen: setChatOpen } = useChatState()
  const [submenuTimeout, setSubmenuTimeout] = useState<NodeJS.Timeout | null>(null)

  // Hide body content when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('mobile-menu-open')
    } else {
      document.body.classList.remove('mobile-menu-open')
    }
  }, [isMobileMenuOpen])

  // Check if we're on a large screen
  useEffect(() => {
    const checkScreenSize = () => {
      const isLarge = window.innerWidth >= 1024
      setIsLargeScreen(isLarge)
      // Close mobile menu when resizing to large screen
      if (isLarge) {
        setIsMobileMenuOpen(false)
        setOpenSubmenu(null)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Close mobile menu when pathname changes (navigation)
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setOpenSubmenu(null)
  }, [pathname])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      clearAuth()
      setIsAuthenticated(false)
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Check auth on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const user = getStoredUser()
        const hasUser = !!user
        setIsAuthenticated(hasUser)
        setIsDemoMode(user?.email === 'demo@bookkeeping.ca')
      } catch (error) {
        console.error('Error checking auth:', error)
        setIsAuthenticated(false)
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  // Listen for route changes
  useEffect(() => {
    const checkAuth = () => {
      try {
        const user = getStoredUser()
        const hasUser = !!user
        setIsAuthenticated(hasUser)
        setIsDemoMode(user?.email === 'demo@bookkeeping.ca')
      } catch (error) {
        console.error('Error checking auth:', error)
      }
    }

    checkAuth()
  }, [pathname])

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'accessToken') {
        try {
          const user = getStoredUser()
          setIsAuthenticated(!!user)
          setIsDemoMode(user?.email === 'demo@bookkeeping.ca')
        } catch (error) {
          console.error('Error checking auth:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const navItems = isAuthenticated ? authenticatedNavItems : unauthenticatedNavItems

  if (loading) {
    return (
      <nav className="bg-blue-600 text-white shadow-md fixed top-0 w-full z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold flex-shrink-0 hover:opacity-80 transition">
            Bookkeeping App
          </Link>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-blue-600 text-white shadow-md fixed top-0 w-full z-50">
      {/* Header Top Row - Logo and Demo Badge */}
      <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-between border-b border-blue-700">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base md:text-3xl lg:text-3xl font-bold flex-shrink-0 hover:opacity-80 transition">
            Bookkeeping App
          </Link>

          {/* Demo Mode Indicator */}
          {isDemoMode && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 border border-yellow-300 rounded text-xs font-medium text-yellow-800">
              <span>⚠️</span>
              <span>Demo Mode</span>
              <span className="text-xs text-yellow-700">(Read-only)</span>
            </div>
          )}
        </div>

        {/* Help and Sign Out on Top Right */}
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <button
              onClick={() => setChatOpen(true)}
              className="text-white hover:bg-blue-700 transition px-2 py-1 text-xs font-medium rounded"
              title="Open chat assistant"
              style={{ transition: 'background-color 0.3s ease' }}
            >
              💬 Help
            </button>
          )}
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="text-white bg-blue-600 hover:bg-red-600 px-3 py-1 text-xs font-medium rounded"
              style={{ transition: 'background-color 0.3s ease' }}
            >
              Sign Out
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="text-white hover:bg-blue-700 px-2 py-1 text-xs font-medium rounded"
                style={{ transition: 'background-color 0.3s ease' }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-white text-blue-600 hover:bg-gray-100 px-3 py-1 text-xs font-medium rounded"
                style={{ transition: 'background-color 0.3s ease' }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Header Bottom Row - Navigation Menu (Desktop Only) */}
      {isLargeScreen && (
      <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-between">
        {/* Desktop Navigation Menu */}
        <div className="flex-1 justify-center items-center gap-0 flex">
          {isAuthenticated ? (
            // Desktop menu for authenticated users
            authenticatedNavItems.map((item) => (
              'submenu' in item ? (
                <div
                  key={item.label}
                  className="relative group py-0"
                  onMouseEnter={() => {
                    if (submenuTimeout) clearTimeout(submenuTimeout)
                    setOpenSubmenu(item.label)
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setOpenSubmenu(null), 800)
                    setSubmenuTimeout(timeout)
                  }}
                >
                  <button
                    className="text-white hover:bg-blue-700 px-2 py-1 md:px-3 md:py-1.5 text-sm md:text-base font-medium rounded flex items-center gap-0.5"
                    style={{ transition: 'background-color 0.3s ease', fontSize: '16px' }}
                    type="button"
                  >
                    {item.label}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
                  {/* Desktop submenu dropdown */}
                  <div
                    className="absolute left-0 w-48 rounded-lg shadow-lg py-2 z-50 border border-gray-400"
                    onMouseEnter={() => {
                      if (submenuTimeout) clearTimeout(submenuTimeout)
                      setOpenSubmenu(item.label)
                    }}
                    onMouseLeave={() => {
                      const timeout = setTimeout(() => setOpenSubmenu(null), 200)
                      setSubmenuTimeout(timeout)
                    }}
                    style={{
                      top: 'calc(100% - 4px)',
                      marginTop: '0px',
                      backgroundColor: '#f3f4f6',
                      opacity: openSubmenu === item.label ? 1 : 0,
                      visibility: openSubmenu === item.label ? 'visible' : 'hidden',
                      pointerEvents: openSubmenu === item.label ? 'auto' : 'none',
                      transition: 'opacity 0.2s ease'
                    }}>
                    {item.submenu.map((subitem) => (
                      <Link
                        key={subitem.href}
                        href={subitem.href}
                        className="block text-gray-700 px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm rounded mx-1 font-semibold hover:font-bold"
                        style={{
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0d47a1';
                          e.currentTarget.style.color = '#FFFFFF';
                          e.currentTarget.style.fontWeight = 'bold';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#374151';
                          e.currentTarget.style.fontWeight = 'normal';
                        }}
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
                  className="text-white hover:bg-blue-700 px-2 py-1 md:px-3 md:py-1.5 text-sm md:text-base font-medium rounded flex items-center gap-0.5"
                  style={{ transition: 'background-color 0.3s ease', fontSize: '16px' }}
                >
                  {item.label}
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
      </div>
      )}

      {/* Mobile Menu Button - Show on Mobile Only */}
      {!isLargeScreen && (
        <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-between">
          {isAuthenticated ? (
            <button
              onClick={(e) => {
                e.preventDefault()
                setIsMobileMenuOpen(!isMobileMenuOpen)
                if (isMobileMenuOpen) {
                  setOpenSubmenu(null)
                }
              }}
              className="text-white hover:bg-blue-700 transition px-3 py-2 text-sm font-medium rounded"
              type="button"
            >
              ☰ Menu
            </button>
          ) : (
            <div className="flex gap-1">
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
        </div>
      )}

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed left-0 right-0 top-[80px] bottom-0 bg-black bg-opacity-50 z-[9998] cursor-pointer"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="bg-blue-700 border-t border-blue-500 fixed top-[80px] left-0 right-0 w-full z-[9999] max-h-[calc(100vh-80px)] overflow-y-auto" style={{ backgroundColor: '#1e40af' }}>
          <div className="w-full px-3 py-3 flex flex-wrap gap-2 bg-blue-700" style={{ backgroundColor: '#1e40af' }}>
            {isAuthenticated ? (
              authenticatedNavItems.map((item) => (
                <div
                  key={'submenu' in item ? item.label : item.href}
                  className={'submenu' in item ? 'relative' : ''}
                >
                  {'submenu' in item ? (
                    <>
                      <button
                        onClick={() => setOpenSubmenu(openSubmenu === item.label ? null : item.label)}
                        className="text-white hover:bg-blue-600 transition px-3 py-1.5 rounded flex items-center justify-between whitespace-nowrap"
                        type="button"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 'auto' }}>
                          <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', display: 'block', whiteSpace: 'nowrap' }}>
                            {item.label}
                          </span>
                        </div>
                        <svg
                          className={`w-3 h-3 transition-transform ${openSubmenu === item.label ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ maxWidth: '12px', maxHeight: '12px' }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>
                      {openSubmenu === item.label && (
                        <div className="w-full bg-gray-300 py-2 px-3 mt-1 rounded flex flex-wrap gap-2">
                          {item.submenu.map((subitem) => (
                            <Link
                              key={subitem.href}
                              href={subitem.href}
                              className="text-gray-900 hover:text-blue-600 hover:bg-gray-200 transition px-2 py-1 text-sm rounded whitespace-nowrap"
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
                      className="text-white hover:bg-blue-600 transition px-3 py-1.5 rounded whitespace-nowrap"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', display: 'inline-block', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-wrap gap-1 w-full">
                {unauthenticatedNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-white hover:bg-blue-600 transition px-3 py-1 text-xs font-bold rounded flex-1 min-w-max text-center"
                    style={{ color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            {isAuthenticated && (
              <Link
                href="/login"
                className="text-white hover:bg-blue-600 transition px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap"
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
