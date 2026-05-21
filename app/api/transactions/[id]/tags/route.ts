import { NextRequest, NextResponse } from 'next/server'
import { addTransactionTag, getTransaction } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const transactionId = parseInt(resolvedParams.id)
    
    // Verify user owns the transaction
    const transaction = getTransaction(transactionId)
    if (!transaction || transaction.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { tag } = await request.json()

    if (!tag?.trim()) {
      return NextResponse.json(
        { error: 'Tag is required' },
        { status: 400 }
      )
    }

    const tags = addTransactionTag(transactionId, tag.trim())
    if (!tags) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ tags })
  } catch (error: any) {
    console.error('Error adding tag:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add tag' },
      { status: 500 }
    )
  }
}
