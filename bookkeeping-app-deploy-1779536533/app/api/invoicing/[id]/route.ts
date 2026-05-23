import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const { id } = await params
    const invoiceId = parseInt(id)

    // First try to find the transaction
    const transaction = db.transactions.find(t => t.id === invoiceId && t.user_id === userId)

    if (!transaction) {
      console.error(`Invoice not found - ID: ${invoiceId}, UserID: ${userId}`)
      console.error(`Available transactions for user ${userId}:`, db.transactions.filter(t => t.user_id === userId).map(t => ({ id: t.id, type: t.type })))
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Accept any transaction type, not just INVOICE
    if (transaction.type !== 'INVOICE') {
      console.warn(`Transaction ${invoiceId} is type ${transaction.type}, not INVOICE`)
    }

    const account = db.chart_of_accounts.find(a => a.id === transaction.account_id)

    const invoice = {
      id: transaction.id,
      invoice_number: transaction.reference_number || `INV-${String(transaction.id).padStart(4, '0')}`,
      client_name: 'Client', // Since we removed client tracking, use a default
      client_id: 0,
      account_name: account?.name || 'Unknown',
      amount: transaction.amount,
      gst_hst_amount: transaction.gst_hst_amount || 0,
      gst_hst_rate: transaction.gst_hst_rate || 0,
      transaction_date: transaction.transaction_date,
      due_date: transaction.due_date,
      sent_date: (transaction as any).sent_date,
      sent_to_email: (transaction as any).sent_to_email,
      description: transaction.description,
      payment_terms: (transaction as any).payment_terms,
      reconciliation_status: transaction.reconciliation_status,
    }

    return NextResponse.json(invoice)
  } catch (error: any) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}
