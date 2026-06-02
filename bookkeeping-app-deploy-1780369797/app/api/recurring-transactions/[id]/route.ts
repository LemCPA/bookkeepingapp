import { NextRequest, NextResponse } from 'next/server'
import { getRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const parsedId = parseInt(id)
    const recurringTransaction = getRecurringTransaction(parsedId)

    if (!recurringTransaction) {
      return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 })
    }

    // Verify user owns this recurring transaction
    if (recurringTransaction.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(recurringTransaction)
  } catch (error: any) {
    console.error('Get recurring transaction error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load recurring transaction' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'UPDATE_RECURRING_BLOCKED',
        method: 'PUT',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot update recurring transactions. Sign up for a free account to use all features.' },
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

    const { id } = await params
    const parsedId = parseInt(id)
    
    // Verify user owns this recurring transaction
    const recurringTransaction = getRecurringTransaction(parsedId)
    if (!recurringTransaction || recurringTransaction.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const success = updateRecurringTransaction(
      parsedId,
      body.accountId,
      body.templateName,
      body.amount,
      body.description,
      body.frequency,
      body.endDate,
      body.isActive,
      body.gstHstRate,
      body.gstHstAmount
    )

    if (!success) {
      return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update recurring transaction error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update recurring transaction' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'DELETE_RECURRING_BLOCKED',
        method: 'DELETE',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot delete recurring transactions. Sign up for a free account to use all features.' },
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

    const { id } = await params
    const parsedId = parseInt(id)
    
    // Verify user owns this recurring transaction
    const recurringTransaction = getRecurringTransaction(parsedId)
    if (!recurringTransaction || recurringTransaction.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const success = deleteRecurringTransaction(parsedId)

    if (!success) {
      return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete recurring transaction error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete recurring transaction' }, { status: 500 })
  }
}
