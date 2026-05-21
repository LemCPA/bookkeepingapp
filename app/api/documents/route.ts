import { NextRequest, NextResponse } from 'next/server'
import { getDocumentsByTransaction, getTransaction } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    const transactionIdNum = parseInt(transactionId)

    // Verify user owns the transaction
    const transaction = getTransaction(transactionIdNum)
    if (!transaction || transaction.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const documents = getDocumentsByTransaction(transactionIdNum)
    return NextResponse.json(documents)
  } catch (error: any) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}