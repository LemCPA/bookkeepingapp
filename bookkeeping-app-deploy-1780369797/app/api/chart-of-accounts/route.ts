import { NextRequest, NextResponse } from 'next/server'
import { getChartOfAccounts, createAccount, updateAccount, deleteAccount } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'
import { DEFAULT_ACCOUNTS } from '@/lib/default-accounts'
import { getCached, setCached, invalidateCache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get optional type filter from query parameter
    const typeFilter = request.nextUrl.searchParams.get('type')

    // Create cache key based on userId and typeFilter
    const cacheKey = `accounts-${userId}-${typeFilter || 'all'}`

    // Check cache first
    const cachedAccounts = getCached(cacheKey)
    if (cachedAccounts) {
      console.log(`Cache hit for ${cacheKey}`)
      return NextResponse.json(cachedAccounts)
    }

    let accounts = getChartOfAccounts(userId)

    // Filter by type if provided (e.g., ?type=EXPENSE)
    if (typeFilter) {
      accounts = accounts.filter(a => a.type === typeFilter)
    }

    // Cache the result for 5 minutes
    setCached(cacheKey, accounts, 5 * 60 * 1000)

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching chart of accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'CREATE_ACCOUNT_BLOCKED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot create accounts. Sign up for a free account to use all features.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { initializeDefaults, code, name, type } = body

    // Initialize default accounts if requested
    if (initializeDefaults) {
      const existingAccounts = getChartOfAccounts(userId)
      const existingCodes = new Set(existingAccounts.map(acc => acc.code))
      let addedCount = 0

      // Add any missing default accounts
      DEFAULT_ACCOUNTS.forEach(acc => {
        // Only create accounts that have a code (skip HOME/VEHICLE sub-accounts which have no code)
        if (acc.code && !existingCodes.has(acc.code)) {
          createAccount(acc.code, acc.name, acc.type, userId)
          addedCount++
        }
      })

      // Invalidate cache for this user
      invalidateCache(`accounts-${userId}`)

      const accounts = getChartOfAccounts(userId)
      return NextResponse.json({
        message: addedCount > 0 ? `Added ${addedCount} missing accounts` : 'All default accounts exist',
        accounts,
        addedCount
      })
    }

    if (!code || !name || !type) {
      return NextResponse.json(
        { error: 'code, name, and type are required' },
        { status: 400 }
      )
    }

    const result = createAccount(code, name, type, userId)

    // Invalidate cache for this user
    invalidateCache(`accounts-${userId}`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Create account error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'UPDATE_ACCOUNT_BLOCKED',
        method: 'PUT',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot update accounts. Sign up for a free account to use all features.' },
        { status: 403 }
      )
    }

    // Rate limiting check
    if (!checkDemoRateLimit(`${userId}`)) {
      logDemoActivity({
        operation: 'RATE_LIMIT_EXCEEDED',
        method: 'PUT',
        endpoint: request.nextUrl.pathname,
        status: 429,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { id, code, name, type } = body

    if (!id || !code || !name || !type) {
      return NextResponse.json(
        { error: 'id, code, name, and type are required' },
        { status: 400 }
      )
    }

    updateAccount(id, code, name, type, userId)

    // Invalidate cache for this user
    invalidateCache(`accounts-${userId}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update account error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update account' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'DELETE_ACCOUNT_BLOCKED',
        method: 'DELETE',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot delete accounts. Sign up for a free account to use all features.' },
        { status: 403 }
      )
    }

    // Rate limiting check
    if (!checkDemoRateLimit(`${userId}`)) {
      logDemoActivity({
        operation: 'RATE_LIMIT_EXCEEDED',
        method: 'DELETE',
        endpoint: request.nextUrl.pathname,
        status: 429,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    deleteAccount(id)

    // Invalidate cache for this user
    invalidateCache(`accounts-${userId}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    )
  }
}
