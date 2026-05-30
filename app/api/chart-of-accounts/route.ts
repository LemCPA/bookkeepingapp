import { NextRequest, NextResponse } from 'next/server'
import { getChartOfAccounts, createAccount, updateAccount, deleteAccount } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Cash', type: 'ASSET' },
  { code: '1010', name: 'Checking Account', type: 'ASSET' },
  { code: '1020', name: 'Savings Account', type: 'ASSET' },
  { code: '1030', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '2010', name: 'Credit Card', type: 'LIABILITY' },
  { code: '3000', name: 'Retained Earnings', type: 'EQUITY' },
  { code: '4000', name: 'Service Revenue', type: 'INCOME' },
  { code: '4010', name: 'Product Revenue', type: 'INCOME' },
  { code: '5100', name: 'Advertising', type: 'EXPENSE' },
  { code: '5110', name: 'Meals and Entertainment (50% rule)', type: 'EXPENSE' },
  { code: '5120', name: 'Insurance', type: 'EXPENSE' },
  { code: '5130', name: 'Interest and Bank Charges', type: 'EXPENSE' },
  { code: '5140', name: 'Business Taxes and Licenses', type: 'EXPENSE' },
  { code: '5150', name: 'Office Expenses', type: 'EXPENSE' },
  { code: '5160', name: 'Supplies', type: 'EXPENSE' },
  { code: '5170', name: 'Legal and Accounting Fees', type: 'EXPENSE' },
  { code: '5180', name: 'Rent', type: 'EXPENSE' },
  { code: '5190', name: 'Salaries and Wages', type: 'EXPENSE' },
  { code: '5200', name: 'Travel', type: 'EXPENSE' },
  { code: '5210', name: 'Telephone and Utilities', type: 'EXPENSE' },
  { code: '5220', name: 'Motor Vehicle Expenses', type: 'EXPENSE' },
  { code: '5230', name: 'Capital Cost Allowance (CCA)', type: 'EXPENSE' },
]

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get optional type filter from query parameter
    const typeFilter = request.nextUrl.searchParams.get('type')

    let accounts = getChartOfAccounts(userId)

    // Filter by type if provided (e.g., ?type=EXPENSE)
    if (typeFilter) {
      accounts = accounts.filter(a => a.type === typeFilter)
    }

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

    // Rate limiting check
    if (!checkDemoRateLimit(`${userId}`)) {
      logDemoActivity({
        operation: 'RATE_LIMIT_EXCEEDED',
        method: 'POST',
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
    const { initializeDefaults, code, name, type } = body

    // Initialize default accounts if requested and user has none
    if (initializeDefaults) {
      const existingAccounts = getChartOfAccounts(userId)
      if (existingAccounts.length === 0) {
        DEFAULT_ACCOUNTS.forEach(acc => {
          createAccount(acc.code, acc.name, acc.type, userId)
        })
        const accounts = getChartOfAccounts(userId)
        return NextResponse.json({ message: 'Default accounts created', accounts })
      }
      return NextResponse.json({ message: 'Accounts already exist', accounts: existingAccounts })
    }

    if (!code || !name || !type) {
      return NextResponse.json(
        { error: 'code, name, and type are required' },
        { status: 400 }
      )
    }

    const result = createAccount(code, name, type, userId)
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
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    )
  }
}
