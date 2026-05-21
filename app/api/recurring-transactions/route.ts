import { NextRequest, NextResponse } from 'next/server'
import { getRecurringTransactions, createRecurringTransaction } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

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

    const body = await request.json()
    const {
      accountId,
      templateName,
      amount,
      description,
      frequency,
      startDate,
      endDate,
      gstHstRate = 0,
      gstHstAmount = 0,
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
