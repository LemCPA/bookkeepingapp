import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'MARK_INVOICE_PAID_BLOCKED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot modify invoices. Sign up for a free account to use all features.' },
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

    const { id } = await params
    const invoiceId = parseInt(id)

    const db = getDb()
    const transaction = db.transactions.find(t => t.id === invoiceId && t.type === 'INVOICE' && t.user_id === userId)

    if (!transaction) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Mark invoice as paid
    transaction.reconciliation_status = 'CLEARED'

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
    console.error('Error marking invoice as paid:', error)
    return NextResponse.json({ error: 'Failed to mark invoice as paid' }, { status: 500 })
  }
}
