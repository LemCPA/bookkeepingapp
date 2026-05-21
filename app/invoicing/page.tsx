'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface InvoiceTransaction {
  id: number
  invoice_number?: string
  client_name: string
  client_id: number
  amount: number
  gst_hst_amount?: number
  transaction_date: string
  due_date?: string
  sent_date?: string
  sent_to_email?: string
  description: string
  payment_terms?: string
  reconciliation_status?: string
}

interface InvoicingSummary {
  totalPending: number
  totalDueToday: number
  totalOverdue: number
  totalPaid: number
  totalAmount: number
}

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<InvoiceTransaction[]>([])
  const [summary, setSummary] = useState<InvoicingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'overdue' | 'paid'>('all')

  useEffect(() => {
    fetchInvoices()
  }, [statusFilter])

  async function fetchInvoices() {
    setLoading(true)
    try {
      const res = await fetch(`/api/invoicing?status=${statusFilter}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (invoice: InvoiceTransaction) => {
    if (invoice.reconciliation_status === 'CLEARED') {
      return <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Paid</span>
    } else if (invoice.sent_date) {
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : null
      const today = new Date('2026-05-18')
      if (dueDate && dueDate < today) {
        return <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">Overdue</span>
      }
      return <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Sent</span>
    }
    return <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">Draft</span>
  }

  const daysUntilDue = (invoice: InvoiceTransaction) => {
    if (!invoice.due_date) return '-'
    const due = new Date(invoice.due_date)
    const today = new Date('2026-05-18')
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `${Math.abs(diff)} days overdue`
    if (diff === 0) return 'Due today'
    return `Due in ${diff} days`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invoice Tracking</h1>
        <p className="text-gray-600 mt-2">Manage invoices, track payments, and send reminders</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Pending (Sent)</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">{summary.totalPending}</p>
            <p className="text-xs text-gray-500 mt-1">invoices awaiting payment</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Due Today</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{summary.totalDueToday}</p>
            <p className="text-xs text-gray-500 mt-1">invoices</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-2">{summary.totalOverdue}</p>
            <p className="text-xs text-gray-500 mt-1">invoices past due</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-2xl font-bold text-green-600 mt-2">{summary.totalPaid}</p>
            <p className="text-xs text-gray-500 mt-1">invoices</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b border-gray-200">
          {['all', 'draft', 'sent', 'overdue', 'paid'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                statusFilter === status
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Invoices Table */}
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No invoices found</p>
            <Link href="/transactions/new" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
              Create first invoice →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Invoice #</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Client</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date Sent</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Due Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invoice.invoice_number || `INV-${String(invoice.id).padStart(4, '0')}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{invoice.client_name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${(invoice.amount + (invoice.gst_hst_amount || 0)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {invoice.sent_date ? new Date(invoice.sent_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(invoice)}</td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <Link
                        href={`/invoicing/${invoice.id}/view`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </Link>
                      {invoice.sent_date && invoice.reconciliation_status !== 'CLEARED' && (
                        <button
                          onClick={() => alert(`Send reminder for ${invoice.invoice_number || invoice.id}`)}
                          className="text-orange-600 hover:text-orange-800 font-medium"
                        >
                          Remind
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Invoice Status Guide</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>Draft:</strong> Created but not yet sent to client</li>
          <li><strong>Sent:</strong> Invoice sent to client, awaiting payment</li>
          <li><strong>Overdue:</strong> Invoice sent but not paid past due date</li>
          <li><strong>Paid:</strong> Invoice marked as cleared/reconciled</li>
        </ul>
      </div>
    </div>
  )
}
