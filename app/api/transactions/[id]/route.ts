import { NextRequest, NextResponse } from 'next/server'
import { getTransaction, updateTransaction, deleteTransaction } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const parsedId = parseInt(id)
    const transaction = getTransaction(parsedId)

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Verify user owns this transaction
    if (transaction.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(transaction)
  } catch (error: any) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transaction' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const parsedId = parseInt(id)
    
    // Verify user owns the transaction
    const transaction = getTransaction(parsedId)
    if (!transaction || transaction.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const success = updateTransaction(
      parsedId,
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

    const updatedTransaction = getTransaction(parsedId)
    return NextResponse.json(updatedTransaction)
  } catch (error: any) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update transaction' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const parsedId = parseInt(id)
    
    // Verify user owns the transaction
    const transaction = getTransaction(parsedId)
    if (!transaction || transaction.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const success = deleteTransaction(parsedId)

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
