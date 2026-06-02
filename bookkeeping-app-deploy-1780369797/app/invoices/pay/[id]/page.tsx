'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface InvoiceData {
  id: number
  invoice_number: string
  amount: number
  gst_hst_amount: number
  transaction_date: string
  due_date: string
  description: string
  payment_link_url?: string
}

export default function InvoicePaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const invoiceId = params.id as string
  const success = searchParams.get('success')

  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)

  useEffect(() => {
    // For a public payment page, we would need a different endpoint
    // that doesn't require authentication but validates the invoice exists
    // For now, this is a placeholder that shows the invoice structure
    setLoading(false)
  }, [invoiceId])

  const generatePaymentLink = async () => {
    if (!invoice) return

    setGeneratingLink(true)
    setError(null)

    try {
      // This would be called by the invoice creator to generate the link
      // For now, this is a placeholder
      console.log('Would generate payment link for invoice:', invoiceId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payment link')
    } finally {
      setGeneratingLink(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Received</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your payment. Your invoice has been marked as paid.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Pay Invoice</h1>
          <p className="text-gray-600">Secure payment powered by Stripe</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Invoice details placeholder */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="border-b border-gray-200 pb-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invoice Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice #</span>
                <span className="font-semibold text-gray-900">INV-{invoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Description</span>
                <span className="font-semibold text-gray-900">Professional Services</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Date</span>
                <span className="font-semibold text-gray-900">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST/HST</span>
              <span>$0.00</span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex justify-between text-2xl font-bold text-gray-900">
              <span>Total Due</span>
              <span>$0.00</span>
            </div>
          </div>

          {/* Payment button */}
          <button
            onClick={generatePaymentLink}
            disabled={generatingLink}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingLink ? 'Processing...' : 'Pay Now'}
          </button>
        </div>

        {/* Security info */}
        <div className="text-center text-gray-600 text-sm">
          <p>🔒 Secure payment processing by Stripe</p>
        </div>
      </div>
    </div>
  )
}
