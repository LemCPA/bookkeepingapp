'use client'

import { useEffect, useState } from 'react'
import { ChartOfAccount } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { createAuthenticatedFetch } from '@/lib/auth'

// Declare PDF.js from global scope (loaded via script tag)
declare global {
  interface Window {
    pdfjsLib: typeof import('pdfjs-dist')
  }
}

interface ExtractedData {
  date?: string
  amount?: number
  description?: string
  vendor_name?: string
  type?: string
  account_type?: string
  gst_hst_amount?: number
  gst_hst_rate?: number
}

export default function DocumentsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [error, setError] = useState('')
  const [gstHstAmount, setGstHstAmount] = useState<number>(0)
  const [gstHstRate, setGstHstRate] = useState<number>(0)
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0)

  useEffect(() => {
    // Load PDF.js from CDN and set up
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      }
    }
    document.head.appendChild(script)

    const authenticatedFetch = createAuthenticatedFetch()
    authenticatedFetch('/api/chart-of-accounts')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch accounts')
        return r.json()
      })
      .then((loadedAccounts) => {
        setAccounts(loadedAccounts)
        // Set default account to first expense account
        const defaultAccount = loadedAccounts.find((a: ChartOfAccount) => a.type === 'EXPENSE')
        if (defaultAccount) {
          setSelectedAccountId(defaultAccount.id)
        }
      })
      .catch(() => setAccounts([]))
  }, [])

  async function convertPdfToImages(file: File): Promise<Blob[]> {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library not loaded')
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise
    const images: Blob[] = []

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 3); pageNum++) {
      setProcessingStatus(`Converting PDF page ${pageNum} of ${Math.min(pdf.numPages, 3)}...`)

      const page = await pdf.getPage(pageNum)
      // Use 5x scale for maximum clarity - makes text large enough for Claude Vision to read reliably
      const viewport = page.getViewport({ scale: 5 })

      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height

      const context = canvas.getContext('2d')!
      // Fill with white background first to ensure clear contrast
      context.fillStyle = 'white'
      context.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise

      // Use PNG format (better for text/numbers) instead of JPEG for improved OCR accuracy
      const blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/png')
      })
      if (blob) {
        images.push(blob)
      }
    }

    return images
  }

  async function analyzeImage(imageBlob: Blob, pageNum: number): Promise<ExtractedData> {
    const formData = new FormData()
    formData.append('file', imageBlob, `page-${pageNum}.png`)

    const authenticatedFetch = createAuthenticatedFetch()
    const response = await authenticatedFetch('/api/analyze-document', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to analyze document')
    }

    const result = await response.json()
    return result.data
  }

  async function handleFileUpload() {
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError('')
    setExtractedData(null)
    setProcessingStatus('')

    try {
      let result: ExtractedData

      if (file.type === 'application/pdf') {
        setProcessingStatus('Converting PDF to images...')
        const images = await convertPdfToImages(file)

        setProcessingStatus(`Analyzing page 1 of ${images.length}...`)
        result = await analyzeImage(images[0], 1)

        // If we have multiple pages, analyze the first few
        if (images.length > 1) {
          for (let i = 1; i < images.length; i++) {
            setProcessingStatus(`Analyzing page ${i + 1} of ${images.length}...`)
            const pageData = await analyzeImage(images[i], i + 1)
            // Merge data from multiple pages (prefer non-empty fields)
            result = {
              ...result,
              ...Object.fromEntries(
                Object.entries(pageData).filter(([_, v]) => v !== undefined && v !== null && v !== '')
              ),
            }
          }
        }
      } else {
        // Handle regular image files
        const formData = new FormData()
        formData.append('file', file)

        const authenticatedFetch = createAuthenticatedFetch()
        const response = await authenticatedFetch('/api/analyze-document', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to analyze document')
        }

        const analysisResult = await response.json()
        result = analysisResult.data
      }

      setExtractedData(result)
      setGstHstAmount(result.gst_hst_amount || 0)
      setGstHstRate(result.gst_hst_rate || 0)
      setProcessingStatus('')
    } catch (err: any) {
      setError(err.message || 'Error analyzing document')
      setProcessingStatus('')
    } finally {
      setLoading(false)
    }
  }

  async function createTransaction() {
    if (!extractedData) return

    if (!selectedAccountId) {
      setError('Please select an account')
      return
    }

    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccountId,
          transaction_date: extractedData.date || new Date().toISOString().split('T')[0],
          amount: extractedData.amount || 0,
          description: extractedData.description || extractedData.vendor_name || 'Document entry',
          type: extractedData.type || 'RECEIPT',
          gst_hst_rate: gstHstRate,
          gst_hst_amount: gstHstAmount,
        }),
      })

      if (!response.ok) throw new Error('Failed to create transaction')

      alert('Transaction created successfully!')
      setFile(null)
      setExtractedData(null)
      setSelectedAccountId(0)
    } catch (err: any) {
      setError(err.message || 'Failed to create transaction')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Scan Documents</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-bold">Upload Receipt or Invoice</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Receipt/Invoice</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Supported: JPG, PNG, GIF, WebP, PDF</p>
            <p className="text-xs text-amber-600 mt-1">💡 For images: use clear scans or photos. For PDFs: first 3 pages will be analyzed</p>
          </div>

          <button
            onClick={handleFileUpload}
            disabled={loading || !file}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? (processingStatus || 'Analyzing...') : 'Analyze Document'}
          </button>

          {processingStatus && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
              {processingStatus}
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
        </div>

        {/* Extracted Data Section */}
        {extractedData && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h2 className="text-xl font-bold">Extracted Data</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Select an account...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="text-gray-900">{extractedData.date || 'Not found'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <p className="text-gray-900 font-bold">{extractedData.amount ? formatCurrency(extractedData.amount) : 'Not found'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-gray-900">{extractedData.description || extractedData.vendor_name || 'Not found'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <p className="text-gray-900">{extractedData.type || 'RECEIPT'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Account Type</label>
                <p className="text-gray-900">{extractedData.account_type || 'Not determined'}</p>
              </div>

              <hr className="my-2" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST/HST Rate (%)</label>
                <select
                  value={gstHstRate}
                  onChange={(e) => setGstHstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>No GST/HST</option>
                  <option value={5}>5% GST</option>
                  <option value={13}>13% HST</option>
                </select>
                {extractedData.gst_hst_rate && extractedData.gst_hst_rate > 0 && (
                  <p className="text-xs text-green-600 mt-1">✓ Detected: {extractedData.gst_hst_rate}%</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST/HST Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={gstHstAmount}
                  onChange={(e) => setGstHstAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                {extractedData.gst_hst_amount && extractedData.gst_hst_amount > 0 && (
                  <p className="text-xs text-green-600 mt-1">✓ Detected: {formatCurrency(extractedData.gst_hst_amount)}</p>
                )}
              </div>
            </div>

            <button
              onClick={createTransaction}
              disabled={!selectedAccountId}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Create Transaction
            </button>

            <button
              onClick={() => {
                setExtractedData(null)
                setFile(null)
                setGstHstAmount(0)
                setGstHstRate(0)
                setSelectedAccountId(0)
              }}
              className="w-full bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2">How it works:</h3>
        <ol className="space-y-1 text-sm text-blue-800 list-decimal list-inside">
          <li>Upload a scanned receipt, invoice, or PDF</li>
          <li>Claude AI automatically extracts the details</li>
          <li>Review the extracted data</li>
          <li>Click "Create Transaction" to save it</li>
        </ol>
      </div>
    </div>
  )
}
