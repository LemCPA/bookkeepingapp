import { NextRequest, NextResponse } from 'next/server'
import {
  createReconciliationItem,
  updateReconciliationItemStatus,
  calculateReconciliationBalance,
  getBankReconciliation,
} from '@/lib/db'
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

    const { id: idStr } = await params
    const reconciliationId = parseInt(idStr)
    
    // Verify user owns this reconciliation
    const reconciliation = getBankReconciliation(reconciliationId)
    if (!reconciliation || reconciliation.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Check if this is a new match or updating existing
    const { transaction_id, status = 'MATCHED' } = body

    // Create new reconciliation item (match)
    const result = createReconciliationItem(reconciliationId, transaction_id, status)

    // Recalculate balance
    const balance = calculateReconciliationBalance(reconciliationId)
    const updatedReconciliation = getBankReconciliation(reconciliationId)

    return NextResponse.json({
      id: result.lastID,
      transaction_id,
      status,
      balance,
      reconciliation: updatedReconciliation,
    })
  } catch (error: any) {
    console.error('Error matching transaction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to match transaction' },
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

    const { id: idStr } = await params
    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    const reconciliationId = parseInt(idStr)
    
    // Verify user owns this reconciliation
    const reconciliation = getBankReconciliation(reconciliationId)
    if (!reconciliation || reconciliation.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the reconciliation item by updating status to UNMATCHED
    const success = updateReconciliationItemStatus(parseInt(itemId), 'UNMATCHED')

    if (!success) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Recalculate balance
    const balance = calculateReconciliationBalance(reconciliationId)
    const updatedReconciliation = getBankReconciliation(reconciliationId)

    return NextResponse.json({
      success: true,
      balance,
      reconciliation: updatedReconciliation,
    })
  } catch (error: any) {
    console.error('Error deleting match:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete match' },
      { status: 500 }
    )
  }
}
