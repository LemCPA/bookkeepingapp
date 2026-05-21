import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { getBillingHistory } from '@/lib/db'
import { downloadInvoicePdf } from '@/lib/helcim-utils'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from JWT token
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const downloadPdf = searchParams.get('download') === 'true'
    const invoiceId = searchParams.get('id')

    // If requesting PDF download for specific invoice
    if (downloadPdf && invoiceId) {
      try {
        const pdfBuffer = await downloadInvoicePdf(invoiceId)

        return new Response(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
          },
        })
      } catch (downloadError) {
        console.error('Error downloading invoice PDF:', downloadError)
        return NextResponse.json(
          {
            error: 'Failed to download invoice',
            details: downloadError instanceof Error ? downloadError.message : 'Unknown error',
          },
          { status: 500 }
        )
      }
    }

    // Get billing history
    const billingHistory = getBillingHistory(userId, limit)

    return NextResponse.json({
      invoices: billingHistory.map(entry => ({
        id: entry.id,
        helcimInvoiceId: entry.helcim_invoice_id,
        amount: entry.amount,
        amountFormatted: `$${(entry.amount / 100).toFixed(2)}`,
        currency: entry.currency,
        status: entry.status,
        periodStart: entry.period_start,
        periodEnd: entry.period_end,
        paidAt: entry.paid_at,
        createdAt: entry.created_at,
        downloadUrl: `/api/billing/invoices?id=${entry.helcim_invoice_id}&download=true`,
      })),
      count: billingHistory.length,
    })
  } catch (error) {
    console.error('Get invoices error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get invoices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
