import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') || 'all'
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    // Parse date range if provided
    let fromDateObj: Date | null = null
    let toDateObj: Date | null = null

    if (fromDate) {
      fromDateObj = new Date(fromDate)
      fromDateObj.setHours(0, 0, 0, 0)
    }
    if (toDate) {
      toDateObj = new Date(toDate)
      toDateObj.setHours(23, 59, 59, 999)
    }

    // Get all RECEIPT type transactions for this user, filtered by date range
    const receipts = db.transactions
      .filter(t => {
        if (t.type !== 'RECEIPT' || t.user_id !== userId) return false

        // Apply date range filter if provided
        if (fromDateObj || toDateObj) {
          const transactionDate = new Date(t.transaction_date)
          if (fromDateObj && transactionDate < fromDateObj) return false
          if (toDateObj && transactionDate > toDateObj) return false
        }

        return true
      })
      .map(t => {
        const account = db.chart_of_accounts.find(a => a.id === t.account_id)
        return {
          id: t.id,
          invoice_number: t.reference_number || `REC-${String(t.id).padStart(4, '0')}`,
          client_name: 'Receipt',
          client_id: 0,
          account_name: account?.name || 'Unknown',
          amount: t.amount,
          gst_hst_amount: t.gst_hst_amount || 0,
          transaction_date: t.transaction_date,
          due_date: t.due_date,
          sent_date: (t as any).sent_date,
          sent_to_email: (t as any).sent_to_email,
          description: t.description,
          payment_terms: (t as any).payment_terms,
          reconciliation_status: t.reconciliation_status,
        }
      })

    // Filter by status
    let filtered = receipts

    if (status === 'unreconciled') {
      filtered = receipts.filter(r => r.reconciliation_status !== 'CLEARED')
    } else if (status === 'reconciled') {
      filtered = receipts.filter(r => r.reconciliation_status === 'CLEARED')
    }
    // else status === 'all': return all

    // Calculate summary metrics
    const totalUnreconciled = receipts.filter(r => r.reconciliation_status !== 'CLEARED').length
    const totalReconciled = receipts.filter(r => r.reconciliation_status === 'CLEARED').length
    const totalAmount = receipts.reduce((sum, r) => sum + r.amount + r.gst_hst_amount, 0)
    const averageAmount = receipts.length > 0 ? totalAmount / receipts.length : 0

    return NextResponse.json({
      receipts: filtered,
      summary: {
        totalUnreconciled,
        totalReconciled,
        totalAmount,
        averageAmount,
      },
    })
  } catch (error: any) {
    console.error('Receipts error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load receipts' }, { status: 500 })
  }
}
