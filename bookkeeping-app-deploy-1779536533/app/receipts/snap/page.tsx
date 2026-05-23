'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createAuthenticatedFetch, getStoredUser } from '@/lib/auth'

interface ExtractedData {
  date: string
  amount: number
  description: string
  vendor_name: string
  type: 'RECEIPT' | 'INVOICE' | 'ADJUSTMENT'
  gst_hst_rate?: number
  gst_hst_amount?: number
}

export default function SnapReceiptPage() {
  const router = useRouter()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notLoggedIn, setNotLoggedIn] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user is logged in on mount
  useState(() => {
    const storedUser = getStoredUser()
    if (!storedUser) {
      setNotLoggedIn(true)
    }
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setImageFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Analyze the image
    await analyzeReceipt(file)
  }

  const analyzeReceipt = async (file: File) => {
    setLoading(true)
    setError(null)
    setExtractedData(null)

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1]

        // Call the analyze-document API
        const authenticatedFetch = createAuthenticatedFetch()
        const response = await authenticatedFetch('/api/analyze-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to analyze receipt')
        }

        const data = await response.json()

        // Map the response to our ExtractedData interface
        const extracted: ExtractedData = {
          date: data.date || new Date().toISOString().split('T')[0],
          amount: parseFloat(data.amount) || 0,
          description: data.description || data.vendor_name || 'Receipt',
          vendor_name: data.vendor_name || '',
          type: (data.type as 'RECEIPT' | 'INVOICE' | 'ADJUSTMENT') || 'RECEIPT',
          gst_hst_rate: data.gst_hst_rate ? parseFloat(data.gst_hst_rate) : undefined,
          gst_hst_amount: data.gst_hst_amount ? parseFloat(data.gst_hst_amount) : undefined,
        }

        setExtractedData(extracted)
      }

      reader.onerror = () => {
        setError('Failed to read image file')
      }

      reader.readAsDataURL(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze receipt')
      setExtractedData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRetake = () => {
    setImageFile(null)
    setImagePreview(null)
    setExtractedData(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleConfirm = () => {
    if (!extractedData) return

    // Navigate to confirmation page with extracted data
    const queryParams = new URLSearchParams({
      date: extractedData.date,
      amount: extractedData.amount.toString(),
      description: extractedData.description,
      vendor_name: extractedData.vendor_name,
      type: extractedData.type,
      ...(extractedData.gst_hst_rate && { gst_hst_rate: extractedData.gst_hst_rate.toString() }),
      ...(extractedData.gst_hst_amount && { gst_hst_amount: extractedData.gst_hst_amount.toString() }),
    })

    router.push(`/receipts/snap/confirm?${queryParams.toString()}`)
  }

  if (notLoggedIn) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">📷 Snap Receipt</h1>
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">Please log in to scan receipts</p>
          <p className="text-blue-700 text-sm mt-2">Use the Sign In button in the top right corner to log in.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📷 Snap Receipt</h1>
        <p className="text-gray-600 mt-2">Take a photo of a receipt and we'll extract the details automatically</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Camera Input */}
        {!imagePreview && (
          <div className="p-8 bg-gradient-to-b from-blue-50 to-blue-100 border-2 border-dashed border-blue-300 rounded-lg text-center">
            <p className="text-gray-700 mb-4">Take a photo of a receipt or invoice</p>
            <label className="inline-block">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 cursor-pointer inline-block">
                📸 Open Camera
              </span>
            </label>
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <img
                src={imagePreview}
                alt="Receipt preview"
                className="w-full h-auto rounded-lg"
              />
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-gray-700">Analyzing receipt...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
                <button
                  onClick={handleRetake}
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Extracted Data Display */}
            {extractedData && !loading && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Extracted Information</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={extractedData.date}
                        onChange={(e) =>
                          setExtractedData({ ...extractedData, date: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={extractedData.amount}
                        onChange={(e) =>
                          setExtractedData({
                            ...extractedData,
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Vendor Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vendor/Merchant
                      </label>
                      <input
                        type="text"
                        value={extractedData.vendor_name}
                        onChange={(e) =>
                          setExtractedData({ ...extractedData, vendor_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={extractedData.description}
                        onChange={(e) =>
                          setExtractedData({ ...extractedData, description: e.target.value })
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* GST/HST Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST/HST Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={extractedData.gst_hst_rate || ''}
                        onChange={(e) =>
                          setExtractedData({
                            ...extractedData,
                            gst_hst_rate: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* GST/HST Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST/HST Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={extractedData.gst_hst_amount || ''}
                        onChange={(e) =>
                          setExtractedData({
                            ...extractedData,
                            gst_hst_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleRetake}
                    className="flex-1 bg-gray-300 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-400 font-medium"
                  >
                    Retake Photo
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                  >
                    ✓ Confirm & Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
