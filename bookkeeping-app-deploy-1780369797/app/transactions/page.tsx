'use client'

import { Suspense } from 'react'
import TransactionsContent from './content'

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading transactions...</div>}>
      <TransactionsContent />
    </Suspense>
  )
}
