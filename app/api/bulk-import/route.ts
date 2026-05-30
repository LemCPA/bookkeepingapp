import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

interface BulkTransaction {
  transaction_date: string
  amount: number
  description: string
  type: 'INVOICE' | 'RECEIPT' | 'ADJUSTMENT'
  account_id: number
  reference_number?: string
  gst_hst_rate?: number
  rowNumber: number
  errors: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'BULK_IMPORT_BLOCKED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot import transactions. Sign up for a free account to use all features.' },
        { status: 403 }
      )
    }

    // Rate limiting check
    if (!checkDemoRateLimit(`${userId}`)) {
      logDemoActivity({
        operation: 'RATE_LIMIT_EXCEEDED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 429,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const transactions = body.transactions as BulkTransaction[]

    if (!Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Invalid request: transactions must be an array' },
        { status: 400 }
      )
    }

    const db = getDb()
    let importedCount = 0
    const errors: string[] = []

    for (const txn of transactions) {
      try {
        // Skip rows with validation errors
        if (txn.errors && txn.errors.length > 0) {
          errors.push(`Row ${txn.rowNumber}: ${txn.errors.join(', ')}`)
          continue
        }

        // Validate account exists and belongs to user
        const accountId = txn.account_id
        const account = db.chart_of_accounts.find(a => a.id === accountId && a.user_id === userId)
        if (!account) {
          errors.push(`Row ${txn.rowNumber}: Account not found or unauthorized`)
          continue
        }

        // Calculate due date (30 days from transaction date)
        const txnDate = new Date(txn.transaction_date)
        const dueDate = new Date(txnDate)
        dueDate.setDate(dueDate.getDate() + 30)

        // Create transaction
        const newTransactionId = db.nextTransactionId++
        db.transactions.push({
          id: newTransactionId,
          user_id: userId,
          account_id: accountId,
          transaction_date: txn.transaction_date,
          amount: txn.amount,
          description: txn.description,
          type: txn.type,
          reference_number: txn.reference_number || '',
          gst_hst_rate: txn.gst_hst_rate || 0,
          gst_hst_amount: txn.gst_hst_rate ? (txn.amount * txn.gst_hst_rate / 100) : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          due_date: dueDate.toISOString().split('T')[0],
          reconciliation_status: '',
        })

        importedCount++
      } catch (error: any) {
        errors.push(`Row ${txn.rowNumber}: ${error.message || error}`)
      }
    }

    // Save database
    saveDb(db)

    return NextResponse.json({
      importedCount,
      totalCount: transactions.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${importedCount} transaction(s)`,
    })
  } catch (error: any) {
    console.error('Error importing transactions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import transactions' },
      { status: 500 }
    )
  }
}
