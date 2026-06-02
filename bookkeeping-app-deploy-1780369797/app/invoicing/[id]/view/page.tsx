'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createAuthenticatedFetch } from '@/lib/auth'

interface Invoice {
  id: number
  invoice_number?: string
  client_name: string
  client_id: number
  amount: number
  gst_hst_amount?: number
  gst_hst_rate?: number
  transaction_date: string
  due_date?: string
  sent_date?: string
  sent_to_email?: string
  description: string
  payment_terms?: string
  reconciliation_status?: string
}

export default function InvoiceViewPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const authenticatedFetch = createAuthenticatedFetch()
        const res = await authenticatedFetch(`/api/invoicing/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setInvoice(data)
        } else {
          setError('Invoice not found')
        }
      } catch (err) {
        console.error('Error fetching invoice:', err)
        setError('Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchInvoice()
    }
  }, [params.id])

  const handleSendInvoice = async () => {
    setSending(true)
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const res = await authenticatedFetch(`/api/invoicing/${params.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.ok) {
        const updated = await res.json()
        setInvoice(updated)
        alert('Invoice marked as sent!')
      } else {
        setError('Failed to send invoice')
      }
    } catch (err) {
      console.error('Error sending invoice:', err)
      setError('Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  const handleMarkAsPaid = async () => {
    setSending(true)
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const res = await authenticatedFetch(`/api/invoicing/${params.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.ok) {
        const updated = await res.json()
        setInvoice(updated)
        alert('Invoice marked as paid!')
      } else {
        setError('Failed to mark invoice as paid')
      }
    } catch (err) {
      console.error('Error marking invoice as paid:', err)
      setError('Failed to mark invoice as paid')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading invoice...</div>
  }

  if (error || !invoice) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Invoice not found'}</p>
        </div>
        <Link href="/invoicing" className="text-blue-600 hover:text-blue-800">
          ← Back to Invoices
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice</h1>
          <p className="text-gray-600 mt-1">#{invoice.invoice_number || `INV-${String(invoice.id).padStart(4, '0')}`}</p>
        </div>
        <Link href="/invoicing" className="text-blue-600 hover:text-blue-800">
          ← Back
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-8 space-y-6">
        {/* Invoice Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase">Bill To</h3>
              <p className="text-lg font-medium text-gray-900 mt-2">{invoice.client_name}</p>
              {invoice.sent_to_email && (
                <p className="text-sm text-gray-600 mt-1">{invoice.sent_to_email}</p>
              )}
            </div>
            <div className="text-right">
              <div className="mb-4">
                <p className="text-sm text-gray-600">Invoice Date</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(invoice.transaction_date).toLocaleDateString()}
                </p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="text-lg font-medium text-gray-900">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Description</p>
            <p className="text-gray-900 mt-1">{invoice.description}</p>
          </div>

          {/* Amount Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${invoice.amount.toFixed(2)}</span>
              </div>
              {invoice.gst_hst_amount && invoice.gst_hst_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">GST/HST ({invoice.gst_hst_rate}%)</span>
                  <span className="font-medium">${invoice.gst_hst_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${(invoice.amount + (invoice.gst_hst_amount || 0)).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-gray-900 font-medium mt-1 capitalize">
                {invoice.reconciliation_status === 'CLEARED' ? 'Paid' : invoice.sent_date ? 'Sent' : 'Draft'}
              </p>
            </div>
            {invoice.sent_date && (
              <div>
                <p className="text-sm text-gray-600">Sent Date</p>
                <p className="text-gray-900 font-medium mt-1">
                  {new Date(invoice.sent_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Terms */}
        {invoice.payment_terms && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium">Payment Terms</p>
            <p className="text-blue-900 mt-2">{invoice.payment_terms}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center flex-wrap">
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          🖨️ Print
        </button>
        {!invoice.sent_date && (
          <button
            onClick={handleSendInvoice}
            disabled={sending}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400"
          >
            {sending ? '⏳ Sending...' : '📧 Send Invoice'}
          </button>
        )}
        {invoice.sent_date && invoice.reconciliation_status !== 'CLEARED' && (
          <button
            onClick={handleMarkAsPaid}
            disabled={sending}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:bg-gray-400"
          >
            {sending ? '⏳ Processing...' : '💰 Mark as Paid'}
          </button>
        )}
        {invoice.reconciliation_status === 'CLEARED' && (
          <div className="px-6 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
            ✓ Paid
          </div>
        )}
      </div>
    </div>
  )
}
