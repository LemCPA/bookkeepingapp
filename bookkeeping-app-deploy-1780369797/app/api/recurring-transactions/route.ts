import { NextRequest, NextResponse } from 'next/server'
import { getRecurringTransactions, createRecurringTransaction } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recurringTransactions = getRecurringTransactions(userId)

    return NextResponse.json(recurringTransactions)
  } catch (error: any) {
    console.error('Recurring transactions error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load recurring transactions' }, { status: 500 })
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
        operation: 'CREATE_RECURRING_BLOCKED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot create recurring transactions. Sign up for a free account to use all features.' },
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
    const {
      account_id: accountId,
      template_name: templateName,
      amount,
      description,
      frequency,
      start_date: startDate,
      end_date: endDate,
      gst_hst_rate: gstHstRate = 0,
      gst_hst_amount: gstHstAmount = 0,
    } = body

    if (!accountId || !templateName || !amount || !frequency || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = createRecurringTransaction(
      userId,
      accountId,
      templateName,
      amount,
      description,
      frequency,
      startDate,
      endDate,
      gstHstRate,
      gstHstAmount
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Create recurring transaction error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create recurring transaction' }, { status: 500 })
  }
}
