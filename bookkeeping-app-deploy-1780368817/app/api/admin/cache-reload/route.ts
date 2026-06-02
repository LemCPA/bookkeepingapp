import { NextRequest, NextResponse } from 'next/server'
import { clearDbCache } from '@/lib/db'

/**
 * Admin endpoint to clear database cache
 * Used in production when database is modified directly
 * No authentication required for local development/production admin access
 */
export async function POST(request: NextRequest) {
  try {
    // Clear the in-memory database cache
    clearDbCache()

    console.log('Database cache cleared successfully')
    return NextResponse.json({
      success: true,
      message: 'Database cache cleared. Next request will reload from file.'
    })
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
