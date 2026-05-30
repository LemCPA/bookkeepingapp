"use client"

import { useState, useRef, useEffect } from "react"
import { compressImage, getCompressionRatio } from "@/lib/image-compression"
import { createAuthenticatedFetch } from "@/lib/auth"

interface ExtractedData {
  date: string
  amount: number
  description: string
  vendor?: string
  gst_hst_rate?: number
  gst_hst_amount?: number
  type: string
  gst_hst_included?: boolean
  gst_hst_applicable?: boolean
}

type DocumentType = "receipt" | "invoice"
type PageStep = "select" | "upload" | "confirm"

export default function ReceiptsPage() {
  const [step, setStep] = useState<PageStep>("upload")
  const [documentType, setDocumentType] = useState<DocumentType | null>("receipt")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [defaultGstRate, setDefaultGstRate] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch user's default GST/HST rate from settings on mount
  useEffect(() => {
    const fetchDefaultGstRate = async () => {
      try {
        const authenticatedFetch = createAuthenticatedFetch()
        const response = await authenticatedFetch("/api/user/settings")
        if (response.ok) {
          const settings = await response.json()
          console.log("Settings fetched:", settings)
          if (settings.default_gst_hst_rate !== undefined) {
            console.log("Setting default GST rate to:", settings.default_gst_hst_rate)
            setDefaultGstRate(settings.default_gst_hst_rate)
          }
        } else {
          console.error("Failed to fetch settings:", response.status)
        }
      } catch (err) {
        console.error("Failed to fetch default GST/HST rate:", err)
        // Fallback to 0 if fetch fails
      }
    }
    fetchDefaultGstRate()
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }
    setSelectedFile(file)
    setError("")
    setCompressing(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
      setCompressing(false)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyzeReceipt = async () => {
    if (!selectedFile) {
      setError("Please select a receipt image")
      return
    }

    setAnalyzing(true)
    setError("")

    // Ensure we have the latest default GST rate before analyzing
    // (in case the initial fetch hasn't completed yet)
    let currentDefaultGstRate = defaultGstRate
    if (!currentDefaultGstRate) {
      try {
        const authenticatedFetch = createAuthenticatedFetch()
        const settingsResponse = await authenticatedFetch("/api/user/settings")
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          if (settings.default_gst_hst_rate !== undefined) {
            currentDefaultGstRate = settings.default_gst_hst_rate
            setDefaultGstRate(currentDefaultGstRate)
            console.log("Fetched default GST rate at analysis time:", currentDefaultGstRate)
          }
        }
      } catch (err) {
        console.log("Could not fetch settings at analysis time, using existing value")
      }
    }

    try {
      // Don't compress for analysis - send high quality for better OCR
      // Only compress for storage later
      const authenticatedFetch = createAuthenticatedFetch()
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await authenticatedFetch("/api/analyze-document", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to analyze receipt")
      }

      const result = await response.json()
      const analysis = result.data || result

      // Validate that we have critical fields
      if (!analysis.amount && analysis.amount !== 0) {
        setError("⚠️ Could not read the amount from the receipt. Please enter it manually below.")
      } else {
        setError("")
      }

      // Debug: log extracted GST/HST values and default rate
      console.log("Extracted GST/HST values:", { gst_hst_rate: analysis.gst_hst_rate, gst_hst_amount: analysis.gst_hst_amount })
      console.log("Using default GST rate:", currentDefaultGstRate)

      // Determine GST/HST rate: use extracted value if > 0, otherwise use default
      // (0 means Claude didn't find GST/HST, so we should use the user's default)
      const finalGstRate = (analysis.gst_hst_rate && analysis.gst_hst_rate > 0) ? analysis.gst_hst_rate : currentDefaultGstRate
      console.log("Final GST rate being used:", finalGstRate)

      // Set extracted data with sensible defaults
      setExtractedData({
        date: analysis.date || new Date().toISOString().split('T')[0],
        amount: analysis.amount ?? 0,
        description: analysis.description || analysis.vendor_name || "Receipt",
        vendor: analysis.vendor_name,
        gst_hst_rate: finalGstRate,
        gst_hst_amount: analysis.gst_hst_amount !== undefined ? analysis.gst_hst_amount : 0,
        type: analysis.type || "RECEIPT",
        // Let user decide - don't pre-select
      })
      setStep("confirm")
    } catch (err: any) {
      console.error("Analysis error:", err)
      setError(`Could not read receipt: ${err.message}. Please enter details manually.`)
      console.log("Using default GST rate in error case:", currentDefaultGstRate)
      // Set empty extracted data so user can fill it in manually
      setExtractedData({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: "",
        type: "RECEIPT",
        gst_hst_rate: currentDefaultGstRate,
        gst_hst_amount: 0,
        // Let user decide on GST/HST status
      })
      setStep("confirm")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSaveTransaction = async () => {
    if (!extractedData || !selectedFile) {
      setError("Missing receipt data")
      return
    }

    if (!extractedData.amount || extractedData.amount === 0) {
      setError("Please enter the amount from the receipt")
      return
    }

    if (!extractedData.description) {
      setError("Please enter a description for the transaction")
      return
    }

    setSaving(true)
    setError("")

    try {
      // Compress image one more time for storage
      const compressed = await compressImage(selectedFile, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
      })

      // Create the transaction
      const authenticatedFetch = createAuthenticatedFetch()

      // Prepare the amount: if GST is included in the amount, send the pre-tax amount
      let submissionAmount = extractedData.amount
      if (extractedData.gst_hst_included === true && extractedData.gst_hst_amount && extractedData.gst_hst_amount > 0) {
        // If GST is included in the receipt total, subtract it to get the pre-tax amount
        submissionAmount = extractedData.amount - extractedData.gst_hst_amount
      }

      const txResponse = await authenticatedFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_date: extractedData.date,
          amount: submissionAmount,
          description: extractedData.description,
          type: extractedData.type,
          account_id: 1, // Default to first account - user can edit later
          gst_hst_rate: extractedData.gst_hst_rate || 0,
          gst_hst_amount: extractedData.gst_hst_amount || 0,
          gst_hst_included: extractedData.gst_hst_included || false,
        }),
      })

      if (!txResponse.ok) throw new Error("Failed to create transaction")
      const transaction = await txResponse.json()

      // Upload the receipt image
      const formData = new FormData()
      formData.append("file", compressed.blob, compressed.name)
      formData.append("transactionId", transaction.id.toString())

      const uploadResponse = await authenticatedFetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) throw new Error("Failed to upload receipt")

      // Success! Reset form and show confirmation
      setError("")
      setTimeout(() => {
        setStep("upload")
        setSelectedFile(null)
        setPreview(null)
        setExtractedData(null)
        window.location.href = `/transactions/${transaction.id}`
      }, 1000)
    } catch (err: any) {
      console.error("Save error:", err)
      const errorMsg = err.message || "Failed to save transaction"

      // Provide helpful error messages
      if (errorMsg.includes("Failed to create transaction")) {
        setError("Could not create transaction. Please check your internet connection and try again.")
      } else if (errorMsg.includes("Failed to upload")) {
        setError("Transaction created but could not upload receipt. Please try uploading the receipt from the transaction details page.")
      } else {
        setError(`Error: ${errorMsg}`)
      }
    } finally {
      setSaving(false)
    }
  }

  if (step === "upload") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <h1 className="text-3xl font-bold">📷 Scan Document</h1>

        {/* Document Type Selector */}
        <div className="flex gap-3">
          <button
            onClick={() => setDocumentType("invoice")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              documentType === "invoice"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            💰 Invoice (Revenue)
          </button>
          <button
            onClick={() => setDocumentType("receipt")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              documentType === "receipt"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📄 Receipt (Expense)
          </button>
        </div>

        {/* Receipt Indicator */}
        {documentType === "receipt" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <span className="text-xl">💸</span>
            <div>
              <p className="font-semibold text-green-900">EXPENSES - Money You're Spending</p>
              <p className="text-sm text-green-800">Receipts are for tracking costs and expenses for your business.</p>
            </div>
          </div>
        )}

        {/* Invoice Indicator */}
        {documentType === "invoice" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <span className="text-xl">💰</span>
            <div>
              <p className="font-semibold text-blue-900">REVENUE - Money You're Earning</p>
              <p className="text-sm text-blue-800">Invoices are for tracking income and sales for your business.</p>
            </div>
          </div>
        )}

        <p className="text-gray-600">
          {documentType === "receipt"
            ? "Take a photo of your receipt and we'll create a transaction automatically"
            : "Take a photo of your invoice and we'll create a transaction automatically"}
        </p>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="border-2 border-dashed p-8 text-center rounded-lg">
            <p className="text-4xl mb-2">📸</p>
            <p className="font-medium mb-2">Tap to take photo or select from gallery</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {selectedFile ? "Change Image" : "Select Image"}
            </button>
          </div>

          {preview && (
            <>
              <div className="bg-gray-100 rounded overflow-hidden flex items-center justify-center mx-auto" style={{ aspectRatio: '3/4', maxHeight: '300px', width: '100%' }}>
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-full h-full object-contain transition-opacity duration-300"
                  style={{ opacity: compressing ? 0.7 : 1 }}
                />
              </div>
              {compressing && <p className="text-center text-sm text-gray-600 mt-2">Processing image...</p>}
            </>
          )}

          {selectedFile && (
            <div className="flex gap-3">
              <button
                onClick={handleAnalyzeReceipt}
                disabled={analyzing || compressing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {analyzing ? "Reading receipt..." : "Next: Review Details"}
              </button>
              <button
                onClick={() => {
                  setSelectedFile(null)
                  setPreview(null)
                  setError("")
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
                }}
                disabled={analyzing || compressing}
                className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 disabled:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Confirmation step
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <h1 className="text-3xl font-bold">
        {documentType === "receipt" ? "Review Receipt Details" : "Review Invoice Details"}
      </h1>

      {/* Receipt Indicator */}
      {documentType === "receipt" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <span className="text-xl">💸</span>
          <div>
            <p className="font-semibold text-green-900">EXPENSES - Money You're Spending</p>
            <p className="text-sm text-green-800">Receipts are for tracking costs and expenses for your business.</p>
          </div>
        </div>
      )}

      {/* Invoice Indicator */}
      {documentType === "invoice" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <span className="text-xl">💰</span>
          <div>
            <p className="font-semibold text-blue-900">REVENUE - Money You're Earning</p>
            <p className="text-sm text-blue-800">Invoices are for tracking income and sales for your business.</p>
          </div>
        </div>
      )}

      <p className="text-gray-600">Check the details below. Edit anything that's not quite right.</p>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {preview && (
          <div className="bg-gray-100 p-4 rounded">
            <div className="overflow-hidden rounded flex items-center justify-center mx-auto" style={{ aspectRatio: '3/4', maxHeight: '400px', backgroundColor: '#f3f4f6' }}>
              <img
                src={preview}
                alt="Receipt"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">Receipt image - check details below</p>
          </div>
        )}

        {extractedData && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={extractedData.date}
                onChange={(e) => setExtractedData({...extractedData, date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Total {!extractedData.amount && <span className="text-red-600">*required</span>}
              </label>
              <input
                type="number"
                step="0.01"
                value={extractedData.amount}
                onChange={(e) => {
                  const newAmount = parseFloat(e.target.value) || 0
                  const newGstAmount = extractedData.gst_hst_applicable !== false && extractedData.gst_hst_rate && extractedData.gst_hst_rate > 0
                    ? (extractedData.gst_hst_included === true
                      ? (newAmount / (1 + extractedData.gst_hst_rate / 100)) * (extractedData.gst_hst_rate / 100)
                      : newAmount * extractedData.gst_hst_rate / 100)
                    : 0
                  setExtractedData({...extractedData, amount: newAmount, gst_hst_amount: parseFloat(newGstAmount.toFixed(2))})
                }}
                placeholder="Enter amount (required)"
                className={`w-full px-3 py-2 border rounded-lg ${!extractedData.amount ? 'border-red-300 bg-red-50' : ''}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description / Vendor</label>
              <input
                type="text"
                value={extractedData.description}
                onChange={(e) => setExtractedData({...extractedData, description: e.target.value})}
                placeholder="e.g., Starbucks Coffee"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">GST/HST Status</label>
              <div className="flex flex-wrap gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gst_hst_status"
                    checked={extractedData.gst_hst_applicable !== false && extractedData.gst_hst_included === true}
                    onChange={() => {
                      const rate = defaultGstRate // Always reset to default when switching
                      const newGstAmount = extractedData.amount && rate > 0
                        ? (extractedData.amount / (1 + rate / 100)) * (rate / 100)
                        : 0
                      setExtractedData({...extractedData, gst_hst_included: true, gst_hst_applicable: true, gst_hst_rate: rate, gst_hst_amount: parseFloat(newGstAmount.toFixed(2))})
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Included in amount</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gst_hst_status"
                    checked={extractedData.gst_hst_applicable !== false && extractedData.gst_hst_included === false}
                    onChange={() => {
                      const rate = defaultGstRate // Always reset to default when switching
                      // For "Separate from amount", the entered amount is the TOTAL (what they paid)
                      // We need to back out the tax to get the subtotal
                      const newGstAmount = extractedData.amount && rate > 0
                        ? extractedData.amount - (extractedData.amount / (1 + rate / 100))
                        : 0
                      setExtractedData({...extractedData, gst_hst_included: false, gst_hst_applicable: true, gst_hst_rate: rate, gst_hst_amount: parseFloat(newGstAmount.toFixed(2))})
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Separate from amount</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gst_hst_status"
                    checked={extractedData.gst_hst_applicable === false}
                    onChange={() => setExtractedData({...extractedData, gst_hst_applicable: false, gst_hst_rate: 0, gst_hst_amount: 0})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">No GST</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">GST/HST Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={extractedData.gst_hst_rate || 0}
                  onChange={(e) => {
                    const newRate = parseFloat(e.target.value) || 0
                    const newGstAmount = extractedData.gst_hst_applicable !== false && extractedData.amount && newRate > 0
                      ? (extractedData.gst_hst_included === true
                        ? (extractedData.amount / (1 + newRate / 100)) * (newRate / 100)
                        : extractedData.amount * newRate / 100)
                      : 0
                    setExtractedData({...extractedData, gst_hst_rate: newRate, gst_hst_amount: parseFloat(newGstAmount.toFixed(2))})
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">GST/HST Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={extractedData.gst_hst_amount || 0}
                  onChange={(e) => setExtractedData({...extractedData, gst_hst_amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {extractedData.gst_hst_included === true && extractedData.amount && extractedData.gst_hst_rate ?
                    `Suggested: $${(((extractedData.amount || 0) / (1 + (extractedData.gst_hst_rate || 0) / 100)) * ((extractedData.gst_hst_rate || 0) / 100)).toFixed(2)} (included in $${extractedData.amount})` :
                    extractedData.gst_hst_included === false && extractedData.amount && extractedData.gst_hst_rate ?
                    `Suggested: $${(((extractedData.amount || 0) * (extractedData.gst_hst_rate || 0) / 100)).toFixed(2)} (on top of $${extractedData.amount})` :
                    'Select GST status and enter amount'
                  }
                </p>
              </div>
            </div>

            {/* Summary Breakdown */}
            <div className="border-t pt-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">Subtotal</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${((extractedData.gst_hst_applicable === false
                        ? extractedData.amount || 0
                        : (extractedData.gst_hst_rate && extractedData.gst_hst_rate > 0
                          ? (extractedData.amount || 0) / (1 + extractedData.gst_hst_rate / 100)
                          : extractedData.amount || 0
                        )
                      ) || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      {extractedData.gst_hst_applicable === false ? 'Tax' : `Tax (${extractedData.gst_hst_rate || 0}%)`}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${(extractedData.gst_hst_amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">Total</p>
                    <p className="text-lg font-semibold text-blue-600">
                      ${(extractedData.amount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setStep("upload")
              setSelectedFile(null)
              setPreview(null)
              setExtractedData(null)
            }}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Retake Photo
          </button>
          <button
            onClick={() => {
              setStep("select")
              setDocumentType(null)
              setSelectedFile(null)
              setPreview(null)
              setExtractedData(null)
            }}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Change Type
          </button>
          <button
            onClick={handleSaveTransaction}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? "Creating transaction..." : "Create Transaction"}
          </button>
        </div>
      </div>
    </div>
  )
}