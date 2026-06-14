import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getInvoicesFromSupabase } from '@/lib/supabase-db'

export async function GET(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') || 'all'
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined

    // Get all INVOICE type transactions from Supabase (cloud storage)
    const invoices = await getInvoicesFromSupabase(userId, status, fromDate, toDate)

    if (!invoices || invoices.length === 0) {
      return NextResponse.json([])
    }

    // Format invoices for API response
    const formatted = invoices.map((t: any) => {
      return {
        id: t.id,
        invoice_number: t.reference_number || `INV-${String(t.id).padStart(4, '0')}`,
        account_name: t.account_name || 'Unknown',
        amount: t.amount,
        gst_hst_amount: t.gst_hst_amount || 0,
        transaction_date: t.transaction_date,
        due_date: t.due_date,
        sent_date: t.sent_date,
        sent_to_email: t.sent_to_email,
        description: t.description,
        payment_terms: t.payment_terms,
        reconciliation_status: t.reconciliation_status,
      }
    })

    // Filter by status
    const today = new Date()
    let filtered = formatted

    if (status === 'draft') {
      // Draft: created but not yet sent
      filtered = formatted.filter(inv => !inv.sent_date)
    } else if (status === 'sent') {
      // Sent: invoice has been sent but not paid/overdue
      filtered = formatted.filter(inv => {
        if (!inv.sent_date) return false
        if (inv.reconciliation_status === 'CLEARED') return false
        const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(new Date(inv.transaction_date).getTime() + 30 * 24 * 60 * 60 * 1000)
        return dueDate >= today
      })
    } else if (status === 'overdue') {
      // Overdue: sent but not paid and past due date
      filtered = formatted.filter(inv => {
        if (!inv.sent_date) return false
        if (inv.reconciliation_status === 'CLEARED') return false
        const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(new Date(inv.transaction_date).getTime() + 30 * 24 * 60 * 60 * 1000)
        return dueDate < today
      })
    } else if (status === 'paid') {
      // Paid: reconciliation status is CLEARED
      filtered = formatted.filter(inv => inv.reconciliation_status === 'CLEARED')
    }
    // else status === 'all': return all

    // Calculate summary metrics
    const totalPending = invoices.filter(inv => {
      if (!inv.sent_date) return false
      if (inv.reconciliation_status === 'CLEARED') return false
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(new Date(inv.transaction_date).getTime() + 30 * 24 * 60 * 60 * 1000)
      return dueDate >= today
    }).length

    const totalDueToday = invoices.filter(inv => {
      if (!inv.sent_date) return false
      if (inv.reconciliation_status === 'CLEARED') return false
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(new Date(inv.transaction_date).getTime() + 30 * 24 * 60 * 60 * 1000)
      return dueDate.toDateString() === today.toDateString()
    }).length

    const totalOverdue = invoices.filter(inv => {
      if (!inv.sent_date) return false
      if (inv.reconciliation_status === 'CLEARED') return false
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(new Date(inv.transaction_date).getTime() + 30 * 24 * 60 * 60 * 1000)
      return dueDate < today
    }).length

    const totalPaid = invoices.filter(inv => inv.reconciliation_status === 'CLEARED').length

    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount + (inv.gst_hst_amount || 0), 0)

    return NextResponse.json({
      invoices: filtered,
      summary: {
        totalPending,
        totalDueToday,
        totalOverdue,
        totalPaid,
        totalAmount,
      },
    })
  } catch (error: any) {
    console.error('Invoicing error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load invoices' }, { status: 500 })
  }
}
