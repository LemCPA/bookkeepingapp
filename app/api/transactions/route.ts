import { NextRequest, NextResponse } from 'next/server'
import { getTransaction, getTransactions, createTransaction, updateTransaction, deleteTransaction } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get('id')
    const month = searchParams.get('month')

    // Filter parameters
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const sortBy = (searchParams.get('sortBy') as 'date' | 'amount') || 'date'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    // Parse array parameters (type=INVOICE&type=RECEIPT format)
    const types = searchParams.getAll('type')

    // If specific transaction ID is requested, return that transaction
    if (transactionId) {
      const transaction = getTransaction(parseInt(transactionId))
      if (!transaction || transaction.user_id !== userId) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
      }
      return NextResponse.json(transaction)
    }

    // Otherwise, return list of transactions for this user with all filters applied
    const transactions = getTransactions(
      userId,
      month || undefined,
      dateFrom || undefined,
      dateTo || undefined,
      types.length > 0 ? types : undefined,
      search || undefined,
      sortBy,
      sortOrder
    )
    return NextResponse.json(transactions)
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

    const body = await request.json()
    const result = createTransaction(
      userId,
      body.account_id,
      body.transaction_date,
      body.amount,
      body.description,
      body.type,
      body.gst_hst_rate || 0,
      body.gst_hst_amount || 0,
      body.reference_number
    )

    // Track first receipt scanned for email sequence
    try {
      const { data: user } = await supabase
        .from('users')
        .select('first_receipt_scanned_at')
        .eq('id', userId)
        .single()

      // If this is the user's first transaction, mark it
      if (user && !user.first_receipt_scanned_at) {
        await supabase
          .from('users')
          .update({
            first_receipt_scanned_at: new Date().toISOString(),
            receipt_count: 1,
          })
          .eq('id', userId)
          .catch(err => console.warn('Could not track first receipt:', err))
      } else if (user) {
        // Increment receipt count
        const currentCount = (user as any).receipt_count || 0
        await supabase
          .from('users')
          .update({
            receipt_count: currentCount + 1,
          })
          .eq('id', userId)
          .catch(err => console.warn('Could not update receipt count:', err))
      }
    } catch (trackingError) {
      // Don't fail transaction if tracking fails
      console.warn('Failed to track receipt:', trackingError)
    }

    return NextResponse.json({ id: result.lastID })
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
      body.reference_number
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
