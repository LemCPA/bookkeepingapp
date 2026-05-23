'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createAuthenticatedFetch } from '@/lib/auth'

interface ExtractedData {
  date: string
  amount: number
  description: string
  vendor_name: string
  type: 'RECEIPT' | 'INVOICE'
  account_type: 'ASSET' | 'EXPENSE'
  gst_hst_amount: number
  gst_hst_rate: number
}

export default function ReceiptScannerPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'capture' | 'preview' | 'extracted'>('capture')

  async function handleImageCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, GIF, or WebP image')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be smaller than 10MB')
      return
    }

    setImageFile(file)
    setError('')

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImagePreview(result)
      setStep('preview')
    }
    reader.readAsDataURL(file)
  }

  async function handleAnalyze() {
    if (!imageFile) return

    setLoading(true)
    setError('')

    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const formData = new FormData()
      formData.append('file', imageFile)

      const response = await authenticatedFetch('/api/analyze-document', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to analyze receipt')
      }

      const result = await response.json()
      setExtractedData(result.data)
      setStep('extracted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze receipt')
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!extractedData || !imageFile) return

    sessionStorage.setItem(
      'extractedReceiptData',
      JSON.stringify({
        ...extractedData,
        receiptImage: imagePreview,
      })
    )

    router.push('/receipts/confirm')
  }

  function handleRetake() {
    setImageFile(null)
    setImagePreview('')
    setExtractedData(null)
    setError('')
    setStep('capture')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">📷 Snap Receipt</h1>
      <p className="text-gray-600 mb-6">Take a photo of your receipt and we'll extract the details for you</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {step === 'capture' && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-6xl mb-4 inline-block"
            >
              📱
            </button>
            <h3 className="text-xl font-bold mb-2">Tap to take a photo</h3>
            <p className="text-gray-600 mb-4">or click to select from your device</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Choose Image
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-4">Receipt Preview</h2>
          <div className="mb-6 flex justify-center">
            <img src={imagePreview} alt="Receipt preview" className="max-w-full max-h-96 rounded-lg shadow" />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Extract Details'}
            </button>
            <button
              onClick={handleRetake}
              className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 font-medium"
            >
              Retake Photo
            </button>
          </div>
        </div>
      )}

      {step === 'extracted' && extractedData && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6">Extracted Details</h2>

          <div className="space-y-4 mb-8 pb-8 border-b">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Date</label>
                <p className="text-lg font-semibold">{extractedData.date}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Amount</label>
                <p className="text-lg font-semibold">${extractedData.amount.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Vendor</label>
              <p className="text-lg font-semibold">{extractedData.vendor_name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Description</label>
              <p className="text-lg font-semibold">{extractedData.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <p className="text-lg font-semibold">{extractedData.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Category</label>
                <p className="text-lg font-semibold">{extractedData.account_type}</p>
              </div>
            </div>

            {extractedData.gst_hst_rate > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Tax Rate</label>
                  <p className="text-lg font-semibold">{extractedData.gst_hst_rate}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tax Amount</label>
                  <p className="text-lg font-semibold">${extractedData.gst_hst_amount.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-900">
              ℹ️ Review the extracted details above. You'll be able to edit any fields on the next page before saving.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Confirm & Continue
            </button>
            <button
              onClick={handleRetake}
              className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 font-medium"
            >
              Retake Photo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
