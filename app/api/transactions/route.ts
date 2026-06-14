import { NextRequest, NextResponse } from 'next/server'
import { getTransaction, getTransactions, updateTransaction, deleteTransaction } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { supabase, createTransactionInSupabase } from '../../../supabase-db'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get('id')

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // If specific transaction ID is requested, return that transaction from Supabase
    if (transactionId) {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', parseInt(transactionId))
        .eq('user_id', userId)
        .single()

      if (error || !transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
      }

      return NextResponse.json(transaction)
    }

    // Fetch all transactions for this user from Supabase (cloud storage)
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })

    if (error) {
      console.error('Supabase transaction fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    return NextResponse.json(transactions || [])
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
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
        operation: 'CREATE_TRANSACTION_BLOCKED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot create transactions. Sign up for a free account to use all features.' },
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

    // Validate required fields
    if (!body.account_id || !body.transaction_date || !body.amount || !body.description || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: account_id, transaction_date, amount, description, type' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Create transaction in Supabase (cloud storage for multi-device sync)
    const transaction = await createTransactionInSupabase(
      userId,
      body.account_id,
      body.transaction_date,
      body.amount,
      body.description,
      body.type,
      body.gst_hst_rate || 0,
      body.gst_hst_amount || 0,
      body.reference_number,
      body.is_vehicle_expense || false,
      body.business_use_percentage || 100,
      body.sent_date,
      body.reconciliation_status,
      body.gst_hst_included,
      body.category
    )

    if (!transaction) {
      return NextResponse.json(
        { error: 'Failed to create transaction in database' },
        { status: 500 }
      )
    }

    return NextResponse.json({ id: transaction.id })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
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
        operation: 'UPDATE_TRANSACTION_BLOCKED',
        method: 'PUT',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot modify transactions. Sign up for a free account to use all features.' },
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

    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get('id')

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    // Verify user owns this transaction
    const transaction = getTransaction(parseInt(transactionId))
    if (!transaction || transaction.user_id !== userId) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const body = await request.json()

    const success = updateTransaction(
      parseInt(transactionId),
      body.account_id,
      body.transaction_date,
      body.amount,
      body.description,
      body.gst_hst_rate,
      body.gst_hst_amount,
      body.reference_number,
      body.gst_hst_included
    )

    if (!success) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const updatedTransaction = getTransaction(parseInt(transactionId))
    return NextResponse.json(updatedTransaction)
  } catch (error: any) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update transaction' },
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
        operation: 'DELETE_TRANSACTION_BLOCKED',
        method: 'DELETE',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot delete transactions. Sign up for a free account to use all features.' },
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

    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get('id')

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    // Verify user owns this transaction
    const transaction = getTransaction(parseInt(transactionId))
    if (!transaction || transaction.user_id !== userId) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const success = deleteTransaction(parseInt(transactionId))

    if (!success) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Transaction deleted' })
  } catch (error: any) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete transaction' },
      { status: 500 }
    )
  }
}
