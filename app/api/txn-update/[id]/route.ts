import { NextRequest, NextResponse } from 'next/server'
import { updateTransaction, getTransaction, getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

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
    const body = await request.json()

    // Verify user owns this transaction
    const db = getDb()
    const txn = db.transactions.find(t => t.id === parsedId)
    if (!txn || txn.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
    return NextResponse.json(
      { error: error.message || 'Failed to update transaction' },
      { status: 500 }
    )
  }
}
