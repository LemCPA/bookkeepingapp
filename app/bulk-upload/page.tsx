'use client'

import { useState, useRef } from 'react'
import { createAuthenticatedFetch } from '@/lib/auth'

interface Transaction {
  transaction_date: string
  amount: number
  description: string
  type: 'INVOICE' | 'RECEIPT' | 'ADJUSTMENT'
  reference_number?: string
  gst_hst_rate?: number
}

interface ParsedTransaction extends Transaction {
  rowNumber: number
  errors: string[]
}

export default function BulkUploadPage() {
  const [uploadMode, setUploadMode] = useState<'csv' | 'documents'>('csv')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [documentFiles, setDocumentFiles] = useState<File[]>([])
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'importing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successCount, setSuccessCount] = useState(0)
  const [lastImportedTransactions, setLastImportedTransactions] = useState<Transaction[]>([])
  const csvInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  // CSV Parsing
  const parseCSV = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        setImportStatus('parsing')
        const content = e.target?.result as string
        const lines = content.split('\n')
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

        const transactions: ParsedTransaction[] = []
        let rowNumber = 2

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue

          const values = lines[i].split(',').map((v) => v.trim())
          const row: any = {}
          headers.forEach((header, idx) => {
            row[header] = values[idx] || ''
          })

          const errors: string[] = []

          // Validate required fields
          if (!row.transaction_date) errors.push('Missing transaction date')
          if (!row.amount || isNaN(parseFloat(row.amount))) errors.push('Invalid amount')
          if (!row.description) errors.push('Missing description')
          if (!row.type || !['INVOICE', 'RECEIPT', 'ADJUSTMENT'].includes(row.type))
            errors.push('Invalid type (must be INVOICE, RECEIPT, or ADJUSTMENT)')

          // Validate date format
          if (row.transaction_date) {
            const date = new Date(row.transaction_date)
            if (isNaN(date.getTime())) errors.push('Invalid date format (use YYYY-MM-DD)')
          }

          transactions.push({
            transaction_date: row.transaction_date,
            amount: parseFloat(row.amount) || 0,
            description: row.description,
            type: row.type || 'ADJUSTMENT',
            reference_number: row.reference_number,
            gst_hst_rate: row.gst_hst_rate ? parseFloat(row.gst_hst_rate) : undefined,
            rowNumber,
            errors,
          })
          rowNumber++
        }

        setParsedTransactions(transactions)
        setImportStatus('idle')
        setErrorMessage('')
      } catch (error) {
        setImportStatus('error')
        setErrorMessage(`Failed to parse CSV: ${error}`)
      }
    }
    reader.readAsText(file)
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCsvFile(file)
      parseCSV(file)
    }
  }

  const handleBulkImport = async () => {
    if (parsedTransactions.length === 0) {
      setErrorMessage('No transactions to import')
      return
    }

    // Check for errors
    const transactionsWithErrors = parsedTransactions.filter((t) => t.errors.length > 0)
    if (transactionsWithErrors.length > 0) {
      setErrorMessage(`Cannot import: ${transactionsWithErrors.length} transaction(s) have errors`)
      return
    }

    setImportStatus('importing')
    try {
      // Filter out the rowNumber and errors fields for the API
      const cleanTransactions = parsedTransactions
        .filter((t) => t.errors.length === 0)
        .map(({ rowNumber, errors, ...rest }) => rest)

      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch('/api/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: cleanTransactions }),
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      const result = await response.json()
      setSuccessCount(result.importedCount)
      setLastImportedTransactions(cleanTransactions)
      setImportStatus('success')
      setParsedTransactions([])
      setCsvFile(null)
      if (csvInputRef.current) csvInputRef.current.value = ''
    } catch (error) {
      setImportStatus('error')
      setErrorMessage(`Import error: ${error}`)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch('/api/bulk-import/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: lastImportedTransactions,
          importedCount: successCount,
        }),
      })

      if (!response.ok) {
        throw new Error('PDF generation failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bulk-import-${Date.now()}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      setErrorMessage(`Failed to download PDF: ${error}`)
    }
  }

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setDocumentFiles(files)
    setErrorMessage('')  // Clear any previous errors
  }

  const handleBulkDocumentAnalysis = async () => {
    if (documentFiles.length === 0) {
      setErrorMessage('No documents selected')
      return
    }

    setImportStatus('importing')
    try {
      const formData = new FormData()
      documentFiles.forEach((file) => {
        formData.append('files', file)
      })

      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch('/api/bulk-scan-documents', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Document analysis failed')
      }

      const result = await response.json()

      if (result.errors && result.errors.length > 0) {
        if (result.analyzedCount === 0) {
          // All documents failed
          setImportStatus('error')
          setErrorMessage(`Failed to analyze ${result.errors.length} document(s): ${result.errors.join('; ')}`)
        } else {
          // Some succeeded, some failed
          setImportStatus('success')
          setErrorMessage(`✓ Analyzed ${result.analyzedCount} document(s). Issues with ${result.errors.length}: ${result.errors.join('; ')}`)
        }
      } else {
        setErrorMessage('')
        setImportStatus('success')
      }

      setSuccessCount(result.analyzedCount)

      setDocumentFiles([])
      if (docInputRef.current) docInputRef.current.value = ''
    } catch (error) {
      setImportStatus('error')
      const errorMsg = error instanceof Error ? error.message : String(error)
      setErrorMessage(`Analysis error: ${errorMsg}. Make sure files are valid documents (PDF, JPG, PNG).`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bulk Import Transactions</h1>
          <p className="text-gray-600">
            Upload multiple transactions via CSV or scan receipts, invoices, and documents
          </p>
        </div>

        {/* Mode Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Choose Import Method</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setUploadMode('csv')
                setParsedTransactions([])
                setErrorMessage('')
                setImportStatus('idle')
              }}
              className={`p-6 rounded-lg border-2 transition ${
                uploadMode === 'csv'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-bold text-lg">CSV Upload</h3>
              <p className="text-sm text-gray-600 mt-1">Upload a CSV file with transaction data</p>
            </button>
            <button
              onClick={() => {
                setUploadMode('documents')
                setDocumentFiles([])
                setErrorMessage('')
                setImportStatus('idle')
              }}
              className={`p-6 rounded-lg border-2 transition ${
                uploadMode === 'documents'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">📷</div>
              <h3 className="font-bold text-lg">Scan Documents</h3>
              <p className="text-sm text-gray-600 mt-1">Scan receipts and invoices (PDF, JPG, PNG)</p>
            </button>
          </div>
        </div>

        {/* CSV Upload Section */}
        {uploadMode === 'csv' && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">CSV Transaction Upload</h2>

            {/* Template Download */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-3">
                Don't have a CSV? Download our template to get started:
              </p>
              <button
                onClick={() => {
                  const template = 'transaction_date,amount,description,type,reference_number,gst_hst_rate\n' +
                    '2026-05-10,1500.00,Consulting Services,INVOICE,INV-001,5\n' +
                    '2026-05-11,250.00,Paper and Pens,RECEIPT,REC-001,13'
                  const blob = new Blob([template], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'transaction_template.csv'
                  a.click()
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
              >
                ↓ Download CSV Template
              </button>
            </div>

            {/* File Upload Area */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Select CSV File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition cursor-pointer"
                onClick={() => csvInputRef.current?.click()}
              >
                <div className="text-4xl mb-2">📁</div>
                <p className="text-gray-600 mb-2">Drag and drop your CSV file here, or click to select</p>
                <p className="text-sm text-gray-500">Supported: .csv files (max 10 MB)</p>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
              </div>
              {csvFile && (
                <p className="mt-3 text-sm text-green-600 font-semibold">
                  ✓ File selected: {csvFile.name}
                </p>
              )}
            </div>

            {/* CSV Format Help */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-3">CSV Format Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">Required Columns:</p>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    <li>• <code className="bg-white px-2 py-1 rounded">transaction_date</code> - YYYY-MM-DD</li>
                    <li>• <code className="bg-white px-2 py-1 rounded">amount</code> - Numeric value</li>
                    <li>• <code className="bg-white px-2 py-1 rounded">description</code> - Transaction description</li>
                    <li>• <code className="bg-white px-2 py-1 rounded">type</code> - INVOICE, RECEIPT, or ADJUSTMENT</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Optional Columns:</p>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    <li>• <code className="bg-white px-2 py-1 rounded">reference_number</code> - Invoice/Receipt #</li>
                    <li>• <code className="bg-white px-2 py-1 rounded">gst_hst_rate</code> - 0, 5, or 13</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Preview Table */}
            {parsedTransactions.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-lg text-gray-900 mb-4">
                  Preview: {parsedTransactions.filter(t => t.errors.length === 0).length} valid transactions
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Row</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTransactions.slice(0, 10).map((t) => (
                        <tr key={t.rowNumber} className={t.errors.length > 0 ? 'bg-red-50' : 'border-b hover:bg-gray-50'}>
                          <td className="px-4 py-2 text-gray-600">{t.rowNumber}</td>
                          <td className="px-4 py-2">{t.transaction_date}</td>
                          <td className="px-4 py-2 text-right font-semibold">${t.amount.toFixed(2)}</td>
                          <td className="px-4 py-2 max-w-xs truncate">{t.description}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                              {t.type}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {t.errors.length > 0 ? (
                              <span className="text-red-600 font-semibold">⚠ Error</span>
                            ) : (
                              <span className="text-green-600 font-semibold">✓ Valid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedTransactions.length > 10 && (
                  <p className="mt-2 text-sm text-gray-600">
                    ... and {parsedTransactions.length - 10} more transactions
                  </p>
                )}

                {/* Error Details */}
                {parsedTransactions.some(t => t.errors.length > 0) && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-bold text-red-900 mb-3">Issues Found:</h4>
                    {parsedTransactions
                      .filter(t => t.errors.length > 0)
                      .map((t) => (
                        <div key={t.rowNumber} className="text-sm text-red-800 mb-2">
                          <strong>Row {t.rowNumber}:</strong> {t.errors.join(', ')}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Import Button */}
            {parsedTransactions.length > 0 && (
              <div className="flex gap-4">
                <button
                  onClick={handleBulkImport}
                  disabled={importStatus === 'importing' || parsedTransactions.some(t => t.errors.length > 0)}
                  className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {importStatus === 'importing' ? 'Importing...' : `Import ${parsedTransactions.filter(t => t.errors.length === 0).length} Transactions`}
                </button>
                <button
                  onClick={() => {
                    setParsedTransactions([])
                    setCsvFile(null)
                    if (csvInputRef.current) csvInputRef.current.value = ''
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Document Scanning Section */}
        {uploadMode === 'documents' && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Scan Documents</h2>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Select Documents to Scan
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition cursor-pointer"
                onClick={() => docInputRef.current?.click()}
              >
                <div className="text-4xl mb-2">📄</div>
                <p className="text-gray-600 mb-2">Drag and drop files here, or click to select</p>
                <p className="text-sm text-gray-500">Supported: PDF, JPG, PNG (max 100 MB total)</p>
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
              </div>
              {documentFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-green-600 mb-3">
                    ✓ {documentFiles.length} file(s) selected
                  </p>
                  <ul className="space-y-2">
                    {documentFiles.map((file, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-gray-400">📄</span>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-blue-900 mb-3">How it works:</h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-3">
                  <span className="font-bold flex-shrink-0">1.</span>
                  <span>Select one or more documents (PDF, JPG, PNG)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold flex-shrink-0">2.</span>
                  <span>Our AI analyzes each document and extracts transaction data</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold flex-shrink-0">3.</span>
                  <span>Documents are linked to created transactions for record keeping</span>
                </li>
              </ol>
            </div>

            {/* Scan Button */}
            {documentFiles.length > 0 && (
              <div className="flex gap-4">
                <button
                  onClick={handleBulkDocumentAnalysis}
                  disabled={importStatus === 'importing'}
                  className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {importStatus === 'importing' ? 'Analyzing Documents...' : `Analyze ${documentFiles.length} Document(s)`}
                </button>
                <button
                  onClick={() => {
                    setDocumentFiles([])
                    if (docInputRef.current) docInputRef.current.value = ''
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Status Messages */}
        {errorMessage && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <p className="font-semibold">⚠ {errorMessage}</p>
          </div>
        )}

        {importStatus === 'success' && (
          <div className="mt-8 space-y-6">
            {/* Success Header */}
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-4xl mb-2">✓</div>
              <p className="font-bold text-green-900 text-lg mb-2">
                {uploadMode === 'csv' ? 'Transactions Imported Successfully!' : 'Documents Analyzed Successfully!'}
              </p>
              <p className="text-green-800">
                {successCount} {uploadMode === 'csv' ? 'transaction(s) imported' : 'document(s) analyzed'}
              </p>
            </div>

            {/* Transaction Details Table */}
            {lastImportedTransactions.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                  <h3 className="font-bold text-gray-900">Imported Transactions - Review & Edit</h3>
                  <p className="text-sm text-gray-600 mt-1">You can edit any fields below before finalizing</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Vendor/Description</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastImportedTransactions.map((tx, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 border-b">
                            <input
                              type="date"
                              value={tx.transaction_date || ''}
                              onChange={(e) => {
                                const updated = [...lastImportedTransactions]
                                updated[idx].transaction_date = e.target.value
                                setLastImportedTransactions(updated)
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          </td>
                          <td className="px-4 py-3 border-b">
                            <input
                              type="text"
                              value={tx.description || ''}
                              onChange={(e) => {
                                const updated = [...lastImportedTransactions]
                                updated[idx].description = e.target.value
                                setLastImportedTransactions(updated)
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="Description"
                            />
                          </td>
                          <td className="px-4 py-3 border-b text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={tx.amount || 0}
                              onChange={(e) => {
                                const updated = [...lastImportedTransactions]
                                updated[idx].amount = parseFloat(e.target.value) || 0
                                setLastImportedTransactions(updated)
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                            />
                          </td>
                          <td className="px-4 py-3 border-b">
                            <select
                              value={tx.type || 'RECEIPT'}
                              onChange={(e) => {
                                const updated = [...lastImportedTransactions]
                                updated[idx].type = e.target.value as 'INVOICE' | 'RECEIPT' | 'ADJUSTMENT'
                                setLastImportedTransactions(updated)
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              <option value="RECEIPT">Receipt</option>
                              <option value="INVOICE">Invoice</option>
                              <option value="ADJUSTMENT">Adjustment</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 border-b text-center">
                            <button
                              onClick={() => {
                                setLastImportedTransactions(lastImportedTransactions.filter((_, i) => i !== idx))
                              }}
                              className="text-red-600 hover:text-red-800 font-semibold text-xs"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-gray-50 border-t text-sm text-gray-600 text-right">
                  Total: <span className="font-bold text-gray-900">${lastImportedTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={handleDownloadPDF}
                className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                📄 Download PDF Report
              </button>
              <button
                onClick={() => {
                  setImportStatus('idle')
                  setErrorMessage('')
                  setSuccessCount(0)
                  setLastImportedTransactions([])
                }}
                className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition"
              >
                Import More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
