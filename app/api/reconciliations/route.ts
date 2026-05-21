import { NextRequest, NextResponse } from 'next/server'
import {
  createBankReconciliation,
  getBankReconciliations,
  getBankReconciliation,
  getEligibleTransactionsForReconciliation,
  getReconciliationItems,
} from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const reconciliationId = searchParams.get('id')
    const accountId = searchParams.get('accountId')

    // If specific reconciliation ID is requested, return that reconciliation with items
    if (reconciliationId) {
      const reconciliation = getBankReconciliation(parseInt(reconciliationId))
      if (!reconciliation) {
        return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 })
      }
      // Verify user owns this reconciliation
      if (reconciliation.user_id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Get items and eligible transactions
      const items = getReconciliationItems(parseInt(reconciliationId))

      // Calculate date range: from start of month through statement date
      const statementDate = new Date(reconciliation.statement_date)
      const startOfMonth = new Date(statementDate.getFullYear(), statementDate.getMonth(), 1)
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0]
      const statementDateStr = reconciliation.statement_date

      const eligibleTransactions = getEligibleTransactionsForReconciliation(
        userId,
        reconciliation.account_id,
        startOfMonthStr,
        statementDateStr
      )
      return NextResponse.json({
        reconciliation,
        items,
        eligibleTransactions,
      })
    }

    // Otherwise, return list of reconciliations for this user
    const reconciliations = getBankReconciliations(
      userId,
      accountId ? parseInt(accountId) : undefined
    )
    return NextResponse.json(reconciliations)
  } catch (error: any) {
    console.error('Error fetching reconciliations:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch reconciliations' }, { status: 500 })
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
    const result = createBankReconciliation(
      userId,
      body.account_id,
      body.statement_date,
      body.statement_opening_balance,
      body.statement_closing_balance
    )

    // Return the created reconciliation with eligible transactions
    const reconciliation = getBankReconciliation(result.lastID)

    // Get eligible transactions for matching
    // Calculate date range: from start of month through statement date
    const statementDate = new Date(body.statement_date)
    const startOfMonth = new Date(statementDate.getFullYear(), statementDate.getMonth(), 1)
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0]

    const eligibleTransactions = getEligibleTransactionsForReconciliation(
      userId,
      body.account_id,
      startOfMonthStr,
      body.statement_date
    )

    return NextResponse.json({
      reconciliation,
      eligibleTransactions,
    })
  } catch (error: any) {
    console.error('Error creating reconciliation:', error)
    return NextResponse.json({ error: error.message || 'Failed to create reconciliation' }, { status: 500 })
  }
}
