import { NextRequest, NextResponse } from 'next/server'
import { addTransactionNote, deleteTransactionNote, updateTransactionNote, getTransaction, getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

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

    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    const note = addTransactionNote(transactionId, content)
    if (!note) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    const db = getDb()
    const txn = db.transactions.find(t => t.id === transactionId)
    return NextResponse.json({ notes: txn?.internal_notes || [] })
  } catch (error: any) {
    console.error('Error adding note:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add note' },
      { status: 500 }
    )
  }
}

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

    const resolvedParams = await params
    const transactionId = parseInt(resolvedParams.id)
    
    // Verify user owns the transaction
    const transaction = getTransaction(transactionId)
    if (!transaction || transaction.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getDb()
    const txn = db.transactions.find(t => t.id === transactionId)

    if (!txn) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ notes: txn.internal_notes || [] })
  } catch (error: any) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}
