import { NextRequest, NextResponse } from 'next/server'
import { updateTransactionNote, deleteTransactionNote } from '@/lib/db'
import { getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const transactionId = parseInt(resolvedParams.id)
    const noteId = parseInt(resolvedParams.noteId)
    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    const db = getDb()
    const txn = db.transactions.find(t => t.id === transactionId)
    if (!txn || txn.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const note = updateTransactionNote(transactionId, noteId, content)
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ notes: txn?.internal_notes || [] })
  } catch (error: any) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update note' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const transactionId = parseInt(resolvedParams.id)
    const noteId = parseInt(resolvedParams.noteId)

    const db = getDb()
    const txn = db.transactions.find(t => t.id === transactionId)
    if (!txn || txn.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const deleted = deleteTransactionNote(transactionId, noteId)
    if (!deleted) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ notes: txn?.internal_notes || [] })
  } catch (error: any) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete note' },
      { status: 500 }
    )
  }
}
