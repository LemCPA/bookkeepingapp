'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import GstFilingContent from './content'
import { canAccessReport } from '@/lib/report-access'

export default function GstFilingPage() {
  const [userPlan, setUserPlan] = useState<string>('free')
  const [hasAccess, setHasAccess] = useState(false)

  // Check subscription access
  useEffect(() => {
    async function checkAccess() {
      try {
        const response = await fetch('/api/billing/subscription')
        if (response.ok) {
          const data = await response.json()
          setUserPlan(data.plan || 'free')
          setHasAccess(canAccessReport('gst-filing', data.plan || 'free'))
        }
      } catch (err) {
        console.error('Failed to check subscription:', err)
        setHasAccess(false)
      }
    }
    checkAccess()
  }, [])

  // Show upgrade prompt if user doesn't have access
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h1>
            <p className="text-gray-600 mb-6">GST Filing Report is available on Starter and Growth plans.</p>
            <p className="text-gray-600 mb-8">You're currently on the <strong>{userPlan}</strong> plan.</p>
            <Link
              href="/billing"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="text-center py-8">Loading GST filing data...</div>}>
      <GstFilingContent />
    </Suspense>
  )
}
