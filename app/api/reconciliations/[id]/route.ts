import { NextRequest, NextResponse } from 'next/server'
import {
  getBankReconciliation,
  updateBankReconciliation,
  getReconciliationItems,
  calculateReconciliationBalance,
} from '@/lib/db'
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

    const { id: idStr } = await params
    const id = parseInt(idStr)
    const reconciliation = getBankReconciliation(id)

    if (!reconciliation) {
      return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 })
    }

    // Verify user owns this reconciliation
    if (reconciliation.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all items for this reconciliation
    const items = getReconciliationItems(id)

    // Get calculated balance
    const balance = calculateReconciliationBalance(id)

    return NextResponse.json({
      reconciliation,
      items,
      balance,
    })
  } catch (error: any) {
    console.error('Error fetching reconciliation:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch reconciliation' }, { status: 500 })
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

    const { id: idStr } = await params
    const id = parseInt(idStr)
    
    // Verify user owns this reconciliation
    const reconciliation = getBankReconciliation(id)
    if (!reconciliation || reconciliation.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const success = updateBankReconciliation(id, body.status)

    if (!success) {
      return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 })
    }

    const updatedReconciliation = getBankReconciliation(id)
    return NextResponse.json(updatedReconciliation)
  } catch (error: any) {
    console.error('Error updating reconciliation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update reconciliation' },
      { status: 500 }
    )
  }
}
