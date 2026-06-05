'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createAuthenticatedFetch } from '@/lib/auth'

// Helper function to generate Supabase public URL
function getSupabasePublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || !storagePath) return ''

  const path = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath
  const bucket = 'T2125'

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

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

interface Document {
  id: number
  file_name: string
  file_path: string
  file_size: number
  uploaded_at: string
}

export default function InvoiceViewPage() {
  const params = useParams()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const authenticatedFetch = createAuthenticatedFetch()
        const res = await authenticatedFetch(`/api/invoicing/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setInvoice(data)

          // Fetch documents for this invoice
          const docsRes = await authenticatedFetch(`/api/documents?id=${params.id}`)
          if (docsRes.ok) {
            const docsData = await docsRes.json()
            setDocuments(docsData || [])
          }
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or image file (PDF, JPG, PNG)')
      return
    }

    setUploadingFile(true)
    setError('')
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('transactionId', params.id as string)

      const uploadResponse = await authenticatedFetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        setError(`Failed to upload file: ${errorData.error || 'Unknown error'}`)
        return
      }

      // Refresh documents
      const docsRes = await authenticatedFetch(`/api/documents?id=${params.id}`)
      if (docsRes.ok) {
        const docsData = await docsRes.json()
        setDocuments(docsData || [])
      }

      alert('✓ File attached successfully')
    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Error uploading file. Please try again.')
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
                <span className="text-gray-600">Pretax Amount</span>
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

        {/* Attachments Section */}
        {documents.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📎 Attachments ({documents.length})</h3>
            <div className="space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocumentId(doc.id)}
                  className="w-full text-left p-3 bg-gray-50 rounded hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {doc.file_name.endsWith('.pdf') ? '📄' : '📸'} {doc.file_name}
                      </p>
                      <p className="text-xs text-gray-600">{(doc.file_size / 1024).toFixed(2)} KB</p>
                    </div>
                    <span className="text-blue-600">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center flex-wrap">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFile}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium disabled:bg-gray-400"
        >
          {uploadingFile ? '⏳ Uploading...' : '📎 Attach File'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={handleFileUpload}
          className="hidden"
        />
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

      {/* Document Viewer Modal */}
      {selectedDocumentId && documents.length > 0 && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-96 overflow-auto flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">
                {documents.find(d => d.id === selectedDocumentId)?.file_name.endsWith('.pdf') ? '📄 PDF' : '📸 Image'}
              </h3>
              <button
                onClick={() => setSelectedDocumentId(null)}
                className="text-2xl hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center">
              {documents.find(d => d.id === selectedDocumentId)?.file_name.endsWith('.pdf') ? (
                <div className="text-center p-8">
                  <p className="text-gray-600 mb-4">📄 PDF Preview</p>
                  <a
                    href={getSupabasePublicUrl(documents.find(d => d.id === selectedDocumentId)?.file_path || '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Download PDF
                  </a>
                </div>
              ) : (
                <img
                  src={getSupabasePublicUrl(documents.find(d => d.id === selectedDocumentId)?.file_path || '')}
                  alt="Invoice attachment"
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                {documents.find(d => d.id === selectedDocumentId)?.file_name} • {' '}
                {((documents.find(d => d.id === selectedDocumentId)?.file_size || 0) / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
