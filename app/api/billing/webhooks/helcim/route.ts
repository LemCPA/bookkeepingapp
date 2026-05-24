import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// This file was previously a Helcim webhook handler
// It has been deprecated as the app has migrated to Stripe
// All Stripe webhook handling is now done at /api/billing/webhook

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/billing/webhook for Stripe webhooks.' },
    { status: 410 }
  )
}
