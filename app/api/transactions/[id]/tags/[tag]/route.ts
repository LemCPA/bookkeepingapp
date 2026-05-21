import { NextRequest, NextResponse } from 'next/server'
import { removeTransactionTag, getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tag: string }> }
) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const transactionId = parseInt(resolvedParams.id)
    const tag = decodeURIComponent(resolvedParams.tag)

    const db = getDb()
    const txn = db.transactions.find(t => t.id === transactionId)
    if (!txn || txn.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tags = removeTransactionTag(transactionId, tag)
    if (!tags) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ tags })
  } catch (error: any) {
    console.error('Error removing tag:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove tag' },
      { status: 500 }
    )
  }
}
