import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { createInvoicePaymentLink } from '@/lib/stripe-utils'
import { isDemoAccount, checkDemoRateLimit } from '@/lib/demo-security'
import { logDemoActivity } from '@/lib/demo-audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo account security checks
    if (isDemoAccount(userId)) {
      logDemoActivity({
        operation: 'CREATE_PAYMENT_LINK_BLOCKED',
        method: 'POST',
        endpoint: request.nextUrl.pathname,
        status: 403,
        ip: request.headers.get('x-forwarded-for') || undefined,
      })
      return NextResponse.json(
        { error: 'Demo account cannot create payment links. Sign up for a free account to use all features.' },
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
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000'

    const db = getDb()
    const transaction = db.transactions.find(
      t => t.id === invoiceId && t.type === 'INVOICE' && t.user_id === userId
    )

    if (!transaction) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check if payment link already exists
    if ((transaction as any).stripe_payment_link_id) {
      return NextResponse.json({
        payment_link_id: (transaction as any).stripe_payment_link_id,
        payment_link_url: (transaction as any).stripe_payment_link_url,
        message: 'Payment link already exists for this invoice',
      })
    }

    // Create Stripe payment link
    const paymentLink = await createInvoicePaymentLink(
      transaction.amount,
      invoiceId,
      transaction.description || `Invoice #${invoiceId}`,
      `${baseUrl}/invoices/pay/${invoiceId}?success=true`,
      `${baseUrl}/invoices/${invoiceId}`
    )

    // Store payment link info with invoice
    ;(transaction as any).stripe_payment_link_id = paymentLink.id
    ;(transaction as any).stripe_payment_link_url = paymentLink.url
    saveDb(db)

    return NextResponse.json({
      payment_link_id: paymentLink.id,
      payment_link_url: paymentLink.url,
      message: 'Payment link created successfully',
    })
  } catch (error: any) {
    console.error('Error creating payment link:', error)
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}
