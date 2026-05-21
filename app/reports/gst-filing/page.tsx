'use client'

import { Suspense } from 'react'
import GstFilingContent from './content'

export default function GstFilingPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading GST filing data...</div>}>
      <GstFilingContent />
    </Suspense>
  )
}
