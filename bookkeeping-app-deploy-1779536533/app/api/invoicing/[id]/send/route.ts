import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const invoiceId = parseInt(id)

    const db = getDb()
    const transaction = db.transactions.find(t => t.id === invoiceId && t.type === 'INVOICE' && t.user_id === userId)

    if (!transaction) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Mark invoice as sent
    const now = new Date().toISOString()
    ;(transaction as any).sent_date = now
    ;(transaction as any).sent_to_email = 'customer@example.com' // Placeholder since we removed client tracking

    saveDb(db)

    // Return updated invoice
    const account = db.chart_of_accounts.find(a => a.id === transaction.account_id)

    const invoice = {
      id: transaction.id,
      invoice_number: transaction.reference_number || `INV-${String(transaction.id).padStart(4, '0')}`,
      client_name: 'Client',
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
    console.error('Error sending invoice:', error)
    return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 })
  }
}
