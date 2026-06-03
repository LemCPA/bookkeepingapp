'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createAuthenticatedFetch, getAccessToken, getRefreshToken } from '@/lib/auth'

// Helper function to generate Supabase public URL
function getSupabasePublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || !storagePath) return ''

  // Remove leading slash if present
  const path = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath

  // Extract bucket and file path
  // storagePath format: receipts/{userId}/{transactionId}/{fileName}
  const bucket = 'T2125'

  // URL encode the path to handle spaces and special characters
  const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/')

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`
}

interface NoteEntry {
  id: number
  content: string
  createdAt: string
  updatedAt?: string
  createdBy?: string
}

interface AuditEntry {
  field: string
  oldValue: any
  newValue: any
  changedAt: string
  changedBy?: string
}

interface Transaction {
  id: number
  client_id: number
  account_id: number
  account_name: string
  transaction_date: string
  amount: number
  gst_hst_rate: number
  gst_hst_amount: number
  description: string
  type: string
  reference_number?: string
  created_at: string
  updated_at?: string
  internal_notes?: NoteEntry[]
  tags?: string[]
  audit_trail?: AuditEntry[]
}

interface Document {
  id: number
  file_name: string
  file_path: string
  file_size: number
  uploaded_at: string
}

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const transactionId = parseInt(params.id as string)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [newNote, setNewNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    fetchTransactionDetails()
  }, [transactionId])

  async function fetchTransactionDetails() {
    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch(`/api/transactions?id=${transactionId}`)
      if (!response.ok) throw new Error('Failed to fetch transaction')
      const data = await response.json()
      setTransaction(data[0] || data)

      // Fetch documents for this transaction
      const docsResponse = await authenticatedFetch(`/api/documents?id=${transactionId}`)
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData)
      }
    } catch (err: any) {
      setError(err.message || 'Error loading transaction')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTag() {
    if (!newTag.trim()) return
    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch(`/api/transactions/${transactionId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag })
      })
      if (response.ok) {
        const updated = await response.json()
        setTransaction(prev => prev ? { ...prev, tags: updated.tags } : null)
        setNewTag('')
      }
    } catch (err) {
      setError('Failed to add tag')
    }
  }

  async function handleRemoveTag(tag: string) {
    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch(`/api/transactions/${transactionId}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        const updated = await response.json()
        setTransaction(prev => prev ? { ...prev, tags: updated.tags } : null)
      }
    } catch (err) {
      setError('Failed to remove tag')
    }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return
    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch(`/api/transactions/${transactionId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      })
      if (response.ok) {
        const updated = await response.json()
        setTransaction(prev => prev ? { ...prev, internal_notes: updated.notes } : null)
        setNewNote('')
        setShowNoteForm(false)
      }
    } catch (err) {
      setError('Failed to add note')
    }
  }

  async function handleUpdateNote(noteId: number) {
    if (!editingNoteContent.trim()) return
    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch(`/api/transactions/${transactionId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingNoteContent })
      })
      if (response.ok) {
        const updated = await response.json()
        setTransaction(prev => prev ? { ...prev, internal_notes: updated.notes } : null)
        setEditingNoteId(null)
        setEditingNoteContent('')
      }
    } catch (err) {
      setError('Failed to update note')
    }
  }

  async function handleDeleteNote(noteId: number) {
    if (!confirm('Delete this note?')) return
    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch(`/api/transactions/${transactionId}/notes/${noteId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        const updated = await response.json()
        setTransaction(prev => prev ? { ...prev, internal_notes: updated.notes } : null)
      }
    } catch (err) {
      setError('Failed to delete note')
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const authenticatedFetch = createAuthenticatedFetch(getAccessToken(), getRefreshToken())
      const response = await authenticatedFetch(`/api/transactions?id=${transactionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete transaction')
      router.push('/transactions')
    } catch (err: any) {
      setError(err.message || 'Error deleting transaction')
      setDeleting(false)
    }
  }

  if (loading) return <div className="text-center py-8">Loading transaction details...</div>
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
  if (!transaction) return <div className="text-center py-8">Transaction not found</div>

  const gstAmount = transaction?.gst_hst_amount ?? 0
  const total = (transaction?.amount ?? 0) + gstAmount

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <a href="/transactions" className="text-blue-600 hover:underline">← Back to Transactions</a>

      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{transaction?.description}</h1>
                {documents.length > 0 && (
                  <button
                    onClick={() => setSelectedDocumentId(documents[0].id)}
                    className="text-2xl hover:scale-110 transition-transform cursor-pointer"
                    title="View receipt"
                  >
                    📷
                  </button>
                )}
              </div>
              <p className="text-gray-600">Transaction #{transaction?.id}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600">{formatCurrency(total)}</div>
            <div className={`text-sm font-medium ${
              transaction?.type === 'INVOICE' ? 'text-blue-600' :
              transaction?.type === 'RECEIPT' ? 'text-green-600' :
              'text-yellow-600'
            }`}>{transaction?.type}</div>
          </div>
        </div>

        <div className="border-t pt-4 flex gap-2">
          <a
            href={`/transactions/${transactionId}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <p className="text-gray-900">{formatDate(transaction?.transaction_date || '')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Account</label>
            <p className="text-gray-900">{transaction?.account_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reference Number</label>
            <p className="text-gray-900">{transaction?.reference_number || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <p className="text-gray-900">{formatCurrency(transaction?.amount || 0)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">GST/HST</label>
            <p className="text-gray-900">{formatCurrency(gstAmount)} ({transaction?.gst_hst_rate || 0}%)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tags Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4">Tags</h2>
            {transaction?.tags && transaction.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {transaction.tags.map((tag) => (
                  <div key={tag} className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-600 hover:text-blue-900 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add a tag (e.g., urgent, reviewed)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Internal Notes Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Internal Notes</h2>
              {!showNoteForm && (
                <button
                  onClick={() => setShowNoteForm(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add Note
                </button>
              )}
            </div>

            {showNoteForm && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write an internal note..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddNote}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Save Note
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteForm(false)
                      setNewNote('')
                    }}
                    className="px-3 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {transaction?.internal_notes && transaction.internal_notes.length > 0 ? (
              <div className="space-y-3">
                {transaction.internal_notes.map((note) => (
                  <div key={note.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {editingNoteId === note.id ? (
                      <div>
                        <textarea
                          value={editingNoteContent}
                          onChange={(e) => setEditingNoteContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 h-20"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateNote(note.id)}
                            className="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingNoteId(null)
                              setEditingNoteContent('')
                            }}
                            className="text-sm px-2 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-900 mb-2">{note.content}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{formatDate(note.createdAt)}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id)
                                setEditingNoteContent(note.content)
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No internal notes yet</p>
            )}
          </div>

          {/* Documents Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4">Receipt Images</h2>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocumentId(doc.id)}
                    className="w-full text-left p-3 bg-gray-50 rounded hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">📸 {doc.file_name}</p>
                        <p className="text-xs text-gray-600">{(doc.file_size / 1024).toFixed(2)} KB • Uploaded {formatDate(doc.uploaded_at)}</p>
                      </div>
                      <span className="text-blue-600 text-lg">→</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No receipt images uploaded yet</p>
            )}
          </div>
        </div>

        {/* Sidebar - Audit Trail */}
        <div className="bg-white rounded-lg shadow-md p-6 h-fit">
          <h2 className="text-lg font-bold mb-4">Audit Trail</h2>
          <div className="space-y-3">
            <div className="pb-3 border-b">
              <p className="text-sm font-medium text-gray-700">Created</p>
              <p className="text-xs text-gray-600">{formatDate(transaction?.created_at || '')}</p>
            </div>

            {transaction?.updated_at && transaction.updated_at !== transaction?.created_at && (
              <div className="pb-3 border-b">
                <p className="text-sm font-medium text-gray-700">Last Modified</p>
                <p className="text-xs text-gray-600">{formatDate(transaction.updated_at)}</p>
              </div>
            )}

            {transaction?.audit_trail && transaction.audit_trail.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700 uppercase">Change History</p>
                {transaction.audit_trail.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="text-xs text-gray-600 pb-2 border-b last:border-b-0">
                    <p className="font-medium text-gray-700">{entry.field}</p>
                    <p className="text-gray-500">From: {String(entry.oldValue)}</p>
                    <p className="text-gray-500">To: {String(entry.newValue)}</p>
                    <p className="text-gray-400 text-xs">{formatDate(entry.changedAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No changes recorded</p>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedDocumentId && documents.length > 0 && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-96 overflow-auto flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Receipt</h3>
              <button
                onClick={() => {
                  setSelectedDocumentId(null)
                  setImageError(false)
                }}
                className="text-2xl hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center bg-gray-100 p-4 overflow-auto">
              {imageError ? (
                <div className="text-center text-gray-600">
                  <p className="text-lg mb-2">Unable to load image</p>
                  <p className="text-sm text-gray-500">The image file may be corrupted or unavailable</p>
                  {(() => {
                    const url = getSupabasePublicUrl(
                      documents.find(d => d.id === selectedDocumentId)?.file_path || ''
                    )
                    console.log('Failed to load image from URL:', url)
                    return <p className="text-xs text-gray-400 mt-2 break-all">{url}</p>
                  })()}
                </div>
              ) : (
                (() => {
                  const doc = documents.find(d => d.id === selectedDocumentId)
                  const url = getSupabasePublicUrl(doc?.file_path || '')
                  const isPDF = doc?.file_name?.toLowerCase().endsWith('.pdf')

                  if (isPDF) {
                    return (
                      <iframe
                        src={url}
                        alt="Receipt"
                        className="w-full h-full border-0"
                        onError={() => {
                          console.error('PDF failed to load from:', url)
                          setImageError(true)
                        }}
                      />
                    )
                  } else {
                    return (
                      <img
                        src={url}
                        alt="Receipt"
                        className="max-w-full max-h-full object-contain"
                        onError={() => {
                          console.error('Image failed to load from:', url)
                          setImageError(true)
                        }}
                      />
                    )
                  }
                })()
              )}
            </div>

            {/* Footer with file info */}
            <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
              {documents.find(d => d.id === selectedDocumentId) && (
                <>
                  <p className="font-medium text-gray-900">
                    {documents.find(d => d.id === selectedDocumentId)?.file_name}
                  </p>
                  <p className="text-xs">
                    {documents.find(d => d.id === selectedDocumentId) &&
                      `${(documents.find(d => d.id === selectedDocumentId)!.file_size / 1024).toFixed(2)} KB`}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
