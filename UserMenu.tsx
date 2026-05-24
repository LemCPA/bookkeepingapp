'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginModal from './LoginModal'

interface User {
  id: number
  email: string
  name: string
}

export default function UserMenu() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user')
    const token = localStorage.getItem('sessionToken')

    if (userStr && token) {
      try {
        const userData = JSON.parse(userStr)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('sessionToken')
      }
    }
    setIsLoading(false)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('user')
      localStorage.removeItem('sessionToken')
      setUser(null)
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isLoading) {
    return null
  }

  // If not logged in, show Sign In button
  if (!user) {
    return (
      <>
        <button
          onClick={() => setIsLoginModalOpen(true)}
          className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
        >
          Sign In
        </button>
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </>
    )
  }

  // If logged in, show user menu
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-white text-sm hidden sm:inline">{user.name}</span>
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b">
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-600">{user.email}</p>
          </div>
          <button
            onClick={() => {
              setIsOpen(false)
              // Could add settings page here
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => {
              setIsOpen(false)
              // Could add help page here
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            ❓ Help & Support
          </button>
          <div className="border-t my-2"></div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
          >
            🚪 Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
