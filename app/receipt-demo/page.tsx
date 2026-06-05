'use client'

import { useState } from 'react'

export default function ReceiptDemo() {
  const [extractedData, setExtractedData] = useState({
    description: 'Starbucks Coffee',
    amount: 79.99,
    transaction_date: '2026-05-26',
    type: 'RECEIPT',
    gst_hst_applicable: true,
    gst_hst_included: true,
    gst_hst_rate: 13,
    gst_hst_amount: 9.20
  })

  const handleAmountChange = (newAmount: number) => {
    const newGstAmount = extractedData.gst_hst_applicable && extractedData.gst_hst_rate
      ? (extractedData.gst_hst_included
        ? (newAmount / (1 + extractedData.gst_hst_rate / 100)) * (extractedData.gst_hst_rate / 100)
        : newAmount * extractedData.gst_hst_rate / 100)
      : 0
    setExtractedData({ ...extractedData, amount: newAmount, gst_hst_amount: parseFloat(newGstAmount.toFixed(2)) })
  }

  const handleRateChange = (newRate: number) => {
    const newGstAmount = extractedData.gst_hst_applicable && extractedData.amount && newRate > 0
      ? (extractedData.gst_hst_included
        ? (extractedData.amount / (1 + newRate / 100)) * (newRate / 100)
        : extractedData.amount * newRate / 100)
      : 0
    setExtractedData({ ...extractedData, gst_hst_rate: newRate, gst_hst_amount: parseFloat(newGstAmount.toFixed(2)) })
  }

  const toggleTaxStatus = (status: 'included' | 'separate' | 'none') => {
    if (status === 'none') {
      setExtractedData({ ...extractedData, gst_hst_applicable: false, gst_hst_rate: 0, gst_hst_amount: 0 })
    } else {
      let newGstAmount = 0
      if (extractedData.amount && extractedData.gst_hst_rate) {
        if (status === 'included') {
          // Tax is included: back-calculate
          newGstAmount = (extractedData.amount / (1 + extractedData.gst_hst_rate / 100)) * (extractedData.gst_hst_rate / 100)
        } else if (status === 'separate') {
          // Tax is NOT included: calculate on top
          newGstAmount = extractedData.amount * extractedData.gst_hst_rate / 100
        }
      }
      setExtractedData({ ...extractedData, gst_hst_included: status === 'included', gst_hst_applicable: true, gst_hst_amount: parseFloat(newGstAmount.toFixed(2)) })
    }
  }

  // Calculate pretax amount, tax, and total based on tax status
  // User always enters the TOTAL amount
  // Toggle determines if tax is included or not
  const pretaxAmount = (() => {
    if (extractedData.gst_hst_applicable === false) {
      // No GST: amount is the pretax amount
      return extractedData.amount
    } else if (extractedData.gst_hst_included === true && extractedData.gst_hst_rate && extractedData.gst_hst_rate > 0) {
      // Tax is included: back-calculate pretax
      return extractedData.amount / (1 + extractedData.gst_hst_rate / 100)
    } else {
      // Tax is NOT included: amount is pretax
      return extractedData.amount
    }
  })()

  const calculatedTotal = (() => {
    if (extractedData.gst_hst_included === true || extractedData.gst_hst_applicable === false) {
      // Total is already the amount entered
      return extractedData.amount
    } else {
      // Tax is NOT included: calculate total = pretax + tax
      return extractedData.amount + (extractedData.gst_hst_amount || 0)
    }
  })()

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8">Receipt Scanner - Summary Breakdown Demo</h1>

        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-1">Total</label>
            <input
              type="number"
              step="0.01"
              value={extractedData.amount}
              onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description / Vendor</label>
            <input
              type="text"
              value={extractedData.description}
              onChange={(e) => setExtractedData({ ...extractedData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Is GST/HST included in the amount above?</label>
            <div className="flex flex-wrap gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gst_hst_status"
                  checked={extractedData.gst_hst_applicable !== false && extractedData.gst_hst_included === true}
                  onChange={() => toggleTaxStatus('included')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Yes, tax is included</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gst_hst_status"
                  checked={extractedData.gst_hst_applicable !== false && extractedData.gst_hst_included === false}
                  onChange={() => toggleTaxStatus('separate')}
                  className="w-4 h-4"
                />
                <span className="text-sm">No, tax will be added</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gst_hst_status"
                  checked={extractedData.gst_hst_applicable === false}
                  onChange={() => toggleTaxStatus('none')}
                  className="w-4 h-4"
                />
                <span className="text-sm">No GST applies</span>
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
                onChange={(e) => handleRateChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">GST/HST Amount</label>
              <input
                type="number"
                step="0.01"
                value={extractedData.gst_hst_amount || 0}
                onChange={(e) => setExtractedData({ ...extractedData, gst_hst_amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* NEW SUMMARY BREAKDOWN - This is what was added to /app/receipts/page.tsx */}
          <div className="border-t pt-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Pretax Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${pretaxAmount.toFixed(2)}
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
                    ${calculatedTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-2 bg-blue-50 p-4 rounded-lg">
          <p><strong>Try these interactions to see the summary update in real-time:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Enter the total amount from the receipt</li>
            <li>Select whether tax is included or will be added</li>
            <li>Adjust the GST/HST rate (try 13%, 5%, 0%)</li>
            <li>Toggle between the three tax options to see different calculations</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
