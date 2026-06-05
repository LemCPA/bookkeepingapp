"use client"

import { useState, useRef, useEffect } from "react"
import { compressImage, getCompressionRatio } from "@/lib/image-compression"
import { createAuthenticatedFetch } from "@/lib/auth"
import { DEFAULT_ACCOUNTS } from "@/lib/default-accounts"
import { parseFlexibleDate, validateDate } from "@/lib/date-parser"
import { assessImageQuality, enhanceImageForOcr, type ImageQuality } from "@/lib/image-quality"

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

interface Account {
  id: number
  code: string
  name: string
  type: string
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
  const [imageQualityWarnings, setImageQualityWarnings] = useState<string[]>([])

  // Transaction type is locked based on document type
  const transactionType = documentType === 'invoice' ? 'INVOICE' : 'RECEIPT'
  const [defaultGstRate, setDefaultGstRate] = useState<number>(0)
  const [gstRegistered, setGstRegistered] = useState(true) // Assume registered by default
  const [selectedCategory, setSelectedCategory] = useState<'BUSINESS' | 'HOME' | 'VEHICLE'>('BUSINESS')
  const [selectedAccountId, setSelectedAccountId] = useState<number | string>('') // For BUSINESS
  const [selectedSubAccount, setSelectedSubAccount] = useState<string>('') // For HOME/VEHICLE
  const [accounts, setAccounts] = useState<Account[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // When transaction type changes to INVOICE, ensure category is BUSINESS and set default account to 8000
  useEffect(() => {
    if (transactionType === 'INVOICE') {
      setSelectedCategory('BUSINESS')
      setSelectedSubAccount('')

      // Auto-select "Gross Business Income" (8000) as default INVOICE account
      const allAccounts = accounts.length > 0 ? accounts : fallbackAccounts
      const defaultAccount = allAccounts.find(a => a.code === '8000')
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id)
        console.log('Auto-selected default INVOICE account:', defaultAccount)
      }
    }
  }, [transactionType, accounts])

  // Fallback accounts from shared Chart of Accounts (source of truth)
  // Generate unique IDs: use code directly as ID for simplicity
  const fallbackAccounts: Account[] = DEFAULT_ACCOUNTS.filter(
    acc => acc.code && (acc.type === 'EXPENSE' || acc.type === 'INCOME')
  ).map((acc) => {
    // For codes like "9281-01", create unique ID by removing dash and concatenating
    // "9281-01" becomes 928101, "9945-03" becomes 994503
    let id: number
    if (acc.code!.includes('-')) {
      id = parseInt(acc.code!.replace(/-/g, ''))
    } else {
      id = parseInt(acc.code!)
    }
    return {
      id,
      code: acc.code!,
      name: acc.name,
      type: acc.type
    }
  })

  // Fetch user's default GST/HST rate and accounts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const authenticatedFetch = createAuthenticatedFetch()

        // Fetch settings
        const settingsResponse = await authenticatedFetch("/api/user/settings")
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          console.log("Settings fetched:", settings)
          if (settings.default_gst_hst_rate !== undefined) {
            console.log("Setting default GST rate to:", settings.default_gst_hst_rate)
            setDefaultGstRate(settings.default_gst_hst_rate)
          }
          // Check if user is registered for GST/HST
          if (settings.gst_registered !== undefined) {
            console.log("GST Registration Status:", settings.gst_registered)
            setGstRegistered(settings.gst_registered)
          }
        } else {
          console.error("Failed to fetch settings:", settingsResponse.status)
        }

        // Fetch accounts (both INCOME and EXPENSE)
        const accountsResponse = await authenticatedFetch("/api/chart-of-accounts")
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json()
          setAccounts(accountsData)
          // Set default account to first expense account if available
          const defaultAccount = accountsData.find((a: Account) => a.type === 'EXPENSE')
          if (defaultAccount) {
            setSelectedAccountId(defaultAccount.id)
          }
          console.log('Loaded accounts from API:', accountsData)
        } else {
          // API failed - use fallback accounts
          console.warn('API failed, using fallback accounts')
          setAccounts(fallbackAccounts)
        }
      } catch (err) {
        console.error("Failed to fetch data:", err)
        // Fallback to fallback accounts if fetch fails
        setAccounts(fallbackAccounts)
      }
    }
    fetchData()
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Support both images and PDFs
    const isImage = file.type.startsWith("image/")
    const isPdf = file.type === "application/pdf"

    if (!isImage && !isPdf) {
      setError("Please select an image file or PDF")
      return
    }

    setSelectedFile(file)
    setError("")

    if (isImage) {
      setCompressing(true)
      const reader = new FileReader()
      reader.onload = async (e) => {
        setPreview(e.target?.result as string)

        // Assess image quality for mobile camera issues
        try {
          const quality = await assessImageQuality(file)
          if (quality.warnings.length > 0) {
            setImageQualityWarnings(quality.warnings)
            console.log('Image quality warnings:', quality.warnings)
          } else {
            setImageQualityWarnings([])
          }
        } catch (err) {
          console.warn('Could not assess image quality:', err)
          setImageQualityWarnings([])
        }

        setCompressing(false)
      }
      reader.readAsDataURL(file)
    } else if (isPdf) {
      // For PDF, just show a preview icon
      setPreview('pdf-file')
      setImageQualityWarnings([])
      setCompressing(false)
    }
  }

  const handleAnalyzeReceipt = async () => {
    if (!selectedFile) {
      setError("Please select a receipt image or PDF")
      return
    }

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

    // PDFs now also go through Claude analysis for OCR extraction
    // (Removed the skip that was setting amount to 0)

    setAnalyzing(true)
    setError("")

    try {
      // For PDFs, convert to images first (5x scale for clarity)
      let fileToProcess = selectedFile
      if (selectedFile.type === "application/pdf") {
        try {
          // Dynamically import PDF.js
          const pdfjsModule = await import('pdfjs-dist')
          const pdfjsLib = pdfjsModule.default
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

          const arrayBuffer = await selectedFile.arrayBuffer()
          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
          const page = await pdf.getPage(1) // First page only

          // Render at 5x scale for clarity
          const viewport = page.getViewport({ scale: 5 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height

          const context = canvas.getContext('2d')!
          context.fillStyle = 'white'
          context.fillRect(0, 0, canvas.width, canvas.height)

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise

          // Convert to blob
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/png')
          })

          fileToProcess = new File([blob], selectedFile.name.replace('.pdf', '.png'), { type: 'image/png' })
        } catch (err) {
          console.warn("Could not convert PDF, using original:", err)
          // Continue with original PDF
        }
      }

      // Fix EXIF orientation for mobile camera images before OCR analysis
      // Mobile cameras often save images rotated, which breaks OCR
      let fileToAnalyze = selectedFile

      try {
        // Read EXIF orientation from the image
        const reader = new FileReader()
        const orientationPromise = new Promise<number>((resolve) => {
          reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer
            const view = new DataView(buffer)

            // Check for JPEG SOI marker (0xFFD8)
            if (view.getUint16(0, false) !== 0xFFD8) {
              resolve(1) // Not a JPEG, no rotation needed
              return
            }

            let offset = 2
            while (offset < Math.min(view.byteLength, 65536)) {
              const marker = view.getUint16(offset, false)
              offset += 2

              if (marker === 0xFFE1) {
                // Found APP1 (EXIF) marker
                const length = view.getUint16(offset, false)
                if (offset + length > view.byteLength) {
                  resolve(1)
                  return
                }

                try {
                  // Look for orientation tag (0x0112) in EXIF
                  const exifStart = offset + 4
                  if (offset + length < view.byteLength) {
                    const exifData = new DataView(buffer, exifStart, length - 4)

                    // Check for Exif header signature
                    if (exifData.byteLength < 8) {
                      resolve(1)
                      return
                    }

                    // Skip TIFF header and read IFD offset
                    let isLittleEndian = false
                    const tiffMark = exifData.getUint16(0, false)
                    if (tiffMark === 0x4949) {
                      isLittleEndian = true
                    }

                    const ifdOffset = exifData.getUint32(4, isLittleEndian)
                    if (ifdOffset + 2 > exifData.byteLength) {
                      resolve(1)
                      return
                    }

                    const ifdData = new DataView(buffer, exifStart + ifdOffset, exifData.byteLength - ifdOffset)
                    const numEntries = ifdData.getUint16(0, isLittleEndian)

                    // Search for orientation tag (0x0112)
                    for (let i = 0; i < numEntries; i++) {
                      const entryOffset = 2 + (i * 12)
                      if (entryOffset + 12 > ifdData.byteLength) break

                      const tag = ifdData.getUint16(entryOffset, isLittleEndian)
                      if (tag === 0x0112) {
                        const value = ifdData.getUint16(entryOffset + 8, isLittleEndian)
                        resolve(Math.min(value, 8)) // Orientation is 1-8
                        return
                      }
                    }
                  }
                } catch (err) {
                  console.error("Error reading EXIF:", err)
                }
                resolve(1)
                return
              }

              // Skip to next marker if not APP1
              if (offset + 2 <= view.byteLength) {
                offset += view.getUint16(offset, false)
              } else {
                break
              }
            }
            resolve(1)
          }
          reader.onerror = () => resolve(1)
          reader.readAsArrayBuffer(selectedFile.slice(0, 65536))
        })

        const orientation = await orientationPromise
        console.log("Detected image orientation:", orientation)

        // If orientation needs correction, rotate the image
        if (orientation > 1) {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Cannot get canvas context')

          const imgData = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = preview || ''
          })

          // Set canvas size based on orientation
          let width = imgData.width
          let height = imgData.height

          if (orientation >= 5 && orientation <= 8) {
            // These orientations swap width and height
            ;[width, height] = [height, width]
          }

          canvas.width = width
          canvas.height = height

          // Apply EXIF rotation
          switch (orientation) {
            case 2:
              ctx.translate(width, 0)
              ctx.scale(-1, 1)
              break
            case 3:
              ctx.translate(width, height)
              ctx.rotate(Math.PI)
              break
            case 4:
              ctx.translate(0, height)
              ctx.scale(1, -1)
              break
            case 5:
              ctx.rotate(Math.PI / 2)
              ctx.translate(0, -imgData.height)
              ctx.scale(1, -1)
              break
            case 6:
              ctx.rotate(Math.PI / 2)
              ctx.translate(0, -imgData.height)
              break
            case 7:
              ctx.rotate(-Math.PI / 2)
              ctx.translate(-imgData.width, 0)
              ctx.scale(1, -1)
              break
            case 8:
              ctx.rotate(-Math.PI / 2)
              ctx.translate(-imgData.width, 0)
              break
          }

          ctx.drawImage(imgData, 0, 0)

          // Convert canvas to blob and create new file
          await new Promise<void>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to rotate image'))
                return
              }
              fileToAnalyze = new File([blob], selectedFile.name, { type: 'image/jpeg' })
              resolve()
            }, 'image/jpeg', 0.95)
          })
        }
      } catch (err) {
        console.warn("Could not apply EXIF orientation, using original image:", err)
        // Continue with original file if rotation fails
      }

      // Send the (potentially rotated or converted) image for OCR analysis
      const authenticatedFetch = createAuthenticatedFetch()
      const formData = new FormData()
      // Use fileToProcess (which handles PDF conversion) for the final analysis
      formData.append("file", fileToProcess === selectedFile ? fileToAnalyze : fileToProcess)

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

      // Calculate GST/HST amount: if we have amount and rate, calculate the GST
      // Default assumption: GST is INCLUDED in the receipt total (most Canadian receipts)
      const finalAmount = analysis.amount ?? 0
      let calculatedGstAmount = 0
      if (finalAmount > 0 && finalGstRate > 0) {
        // For included GST: amount / (1 + rate%) = subtotal, then subtotal * rate% = gst
        calculatedGstAmount = (finalAmount / (1 + finalGstRate / 100)) * (finalGstRate / 100)
      }
      const finalGstAmount = analysis.gst_hst_amount && analysis.gst_hst_amount > 0 ? analysis.gst_hst_amount : parseFloat(calculatedGstAmount.toFixed(2))

      console.log(`Calculated GST: Amount $${finalAmount} with ${finalGstRate}% rate = $${finalGstAmount}`)

      // Parse the extracted date (Claude may return various formats)
      const parsedDate = analysis.date ? parseFlexibleDate(analysis.date) : null
      const finalDate = (parsedDate && validateDate(parsedDate)) ? parsedDate : new Date().toISOString().split('T')[0]
      if (analysis.date && !parsedDate) {
        console.warn('Could not parse extracted date:', analysis.date)
      }

      // Set extracted data with sensible defaults
      setExtractedData({
        date: finalDate,
        amount: finalAmount,
        description: analysis.description || analysis.vendor_name || "Receipt",
        vendor: analysis.vendor_name,
        gst_hst_rate: finalGstRate,
        gst_hst_amount: finalGstAmount,
        gst_hst_included: finalGstRate > 0 ? true : false,  // Default to "included" if we have a rate
        gst_hst_applicable: finalGstRate > 0,
        type: analysis.type || "RECEIPT",
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
        gst_hst_included: currentDefaultGstRate > 0,
        gst_hst_applicable: currentDefaultGstRate > 0,
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
      // For PDFs, skip compression; for images, compress
      let fileToUpload: { blob: Blob; name: string }
      if (selectedFile.type === "application/pdf") {
        fileToUpload = {
          blob: selectedFile,
          name: selectedFile.name,
        }
      } else {
        fileToUpload = await compressImage(selectedFile, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
        })
      }

      // Create the transaction
      const authenticatedFetch = createAuthenticatedFetch()

      // Prepare the amount: if GST is included in the amount, send the pre-tax amount
      let submissionAmount = extractedData.amount
      if (extractedData.gst_hst_included === true && extractedData.gst_hst_amount && extractedData.gst_hst_amount > 0) {
        // If GST is included in the receipt total, subtract it to get the pre-tax amount
        submissionAmount = extractedData.amount - extractedData.gst_hst_amount
      }

      // Validate selection based on category
      if (selectedCategory === 'BUSINESS' && !selectedAccountId) {
        setError("Please select an account")
        setSaving(false)
        return
      }
      if ((selectedCategory === 'HOME' || selectedCategory === 'VEHICLE') && !selectedSubAccount) {
        setError("Please select an expense type")
        setSaving(false)
        return
      }

      // Build request body
      const requestBody: any = {
        transaction_date: extractedData.date,
        amount: submissionAmount,
        description: extractedData.description,
        type: transactionType,
        gst_hst_rate: extractedData.gst_hst_rate || 0,
        gst_hst_amount: extractedData.gst_hst_amount || 0,
        gst_hst_included: extractedData.gst_hst_included || false,
        category: selectedCategory,
      }

      // Add account based on category
      if (selectedCategory === 'BUSINESS') {
        const accountIdNumber = typeof selectedAccountId === 'string' ? parseInt(selectedAccountId, 10) : selectedAccountId
        console.error('🔴 BUSINESS CATEGORY - selectedAccountId:', selectedAccountId, 'type:', typeof selectedAccountId, 'converted:', accountIdNumber)
        console.error('🔴 Available accounts:', accounts.map(a => ({ id: a.id, code: a.code, name: a.name, type: typeof a.id })))
        console.error('🔴 Searching for account with ID:', accountIdNumber, 'type:', typeof accountIdNumber)
        debugger; // PAUSE HERE - Check console before continuing
        requestBody.account_id = accountIdNumber
        const selectedAccount = (accounts.length > 0 ? accounts : fallbackAccounts).find(a => {
          console.error(`  Comparing: a.id=${a.id} (${typeof a.id}) === accountIdNumber=${accountIdNumber} (${typeof accountIdNumber}) ? ${a.id === accountIdNumber}`)
          return a.id === accountIdNumber
        })
        console.error('🔴 Found account:', selectedAccount ? { id: selectedAccount.id, code: selectedAccount.code, name: selectedAccount.name } : 'NOT FOUND')
        requestBody.is_vehicle_expense = selectedAccount?.code?.startsWith('52') || selectedAccount?.name.includes('Motor Vehicle')
      } else if (selectedCategory === 'HOME') {
        // Find HOME sub-account by exact name match
        const allAccounts = accounts.length > 0 ? accounts : fallbackAccounts
        const homeAccounts = allAccounts.filter(a => a.code?.startsWith('9945-'))

        console.log('[HOME] Available HOME accounts:', homeAccounts.map(a => ({ id: a.id, code: a.code, name: a.name })))
        console.log('[HOME] Looking for sub-account:', selectedSubAccount)

        let selectedAccount = homeAccounts.find(a => a.name === selectedSubAccount)

        console.log('[HOME] Matched account:', selectedAccount ? { id: selectedAccount.id, code: selectedAccount.code, name: selectedAccount.name } : 'NOT FOUND')

        // Handle "Other Expenses" by mapping to "Supplies (Home)" or using parent account
        if (!selectedAccount && selectedSubAccount === 'Other Expenses') {
          selectedAccount = homeAccounts.find(a => a.name.includes('Supplies') || a.code === '9945-07')
          if (!selectedAccount) {
            // Fallback to parent account if Supplies not found
            selectedAccount = allAccounts.find(a => a.code === '9945')
          }
        }

        if (!selectedAccount) {
          console.error('[HOME] CRITICAL: Could not find HOME account for', selectedSubAccount)
          console.error('[HOME] selectedSubAccount value:', selectedSubAccount)
          console.error('[HOME] selectedCategory value:', selectedCategory)
          setError(`Could not find HOME account for "${selectedSubAccount}". Please select a valid expense type.`)
          setSaving(false)
          return
        }
        console.log('[HOME] Final selected account ID:', selectedAccount.id)
        requestBody.account_id = selectedAccount.id
      } else if (selectedCategory === 'VEHICLE') {
        // Find VEHICLE sub-account by exact name match
        const allAccounts = accounts.length > 0 ? accounts : fallbackAccounts
        const vehicleAccounts = allAccounts.filter(a => a.code?.startsWith('9281-'))

        console.log('[VEHICLE] Available VEHICLE accounts:', vehicleAccounts.map(a => ({ id: a.id, code: a.code, name: a.name })))
        console.log('[VEHICLE] Looking for sub-account:', selectedSubAccount)

        let selectedAccount = vehicleAccounts.find(a => a.name === selectedSubAccount)

        console.log('[VEHICLE] Matched account:', selectedAccount ? { id: selectedAccount.id, code: selectedAccount.code, name: selectedAccount.name } : 'NOT FOUND')

        // Handle "Other Vehicle Expenses" by mapping to a catch-all vehicle account or parent
        if (!selectedAccount && selectedSubAccount === 'Other Vehicle Expenses') {
          // Try to find an existing catch-all account, otherwise use parent
          selectedAccount = vehicleAccounts[vehicleAccounts.length - 1] // Last vehicle account as fallback
          if (!selectedAccount) {
            selectedAccount = allAccounts.find(a => a.code === '9281')
          }
        }

        if (!selectedAccount) {
          console.error('[VEHICLE] CRITICAL: Could not find VEHICLE account for', selectedSubAccount)
          console.error('[VEHICLE] selectedSubAccount value:', selectedSubAccount)
          console.error('[VEHICLE] selectedCategory value:', selectedCategory)
          setError(`Could not find VEHICLE account for "${selectedSubAccount}". Please select a valid expense type.`)
          setSaving(false)
          return
        }
        console.log('[VEHICLE] Final selected account ID:', selectedAccount.id)
        requestBody.account_id = selectedAccount.id
        requestBody.is_vehicle_expense = true
      }

      console.log('[SUBMIT] Form state at submission:', {
        selectedCategory,
        selectedSubAccount,
        selectedAccountId,
        categoryMatch: selectedCategory === 'HOME' ? 'HOME matched' : selectedCategory === 'VEHICLE' ? 'VEHICLE matched' : selectedCategory === 'BUSINESS' ? 'BUSINESS matched' : 'NO MATCH'
      })
      console.log('[SUBMIT] Creating transaction with data:', requestBody)

      const txResponse = await authenticatedFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      console.log('Transaction creation response:', { ok: txResponse.ok, status: txResponse.status })

      if (!txResponse.ok) {
        const errorText = await txResponse.text()
        console.error('Transaction creation error:', errorText)
        throw new Error(`Failed to create transaction: ${txResponse.status} ${errorText}`)
      }
      const transaction = await txResponse.json()

      // Upload the receipt file
      const formData = new FormData()
      formData.append("file", fileToUpload.blob, fileToUpload.name)
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
              accept="image/*,application/pdf"
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
                {preview === 'pdf-file' ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-gray-700">
                    <span className="text-6xl">📄</span>
                    <p className="font-medium">{selectedFile?.name}</p>
                    <p className="text-sm text-gray-500">PDF ready to upload</p>
                  </div>
                ) : (
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="w-full h-full object-contain transition-opacity duration-300"
                    style={{ opacity: compressing ? 0.7 : 1 }}
                  />
                )}
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
              {preview === 'pdf-file' ? (
                <div className="flex flex-col items-center justify-center gap-2 text-gray-700">
                  <span className="text-6xl">📄</span>
                  <p className="font-medium text-sm">{selectedFile?.name}</p>
                </div>
              ) : (
                <img
                  src={preview}
                  alt="Receipt"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {preview === 'pdf-file' ? 'PDF file - check details below' : 'Receipt image - check details below'}
            </p>
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
                value={extractedData.amount && extractedData.amount > 0 ? extractedData.amount : ''}
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
              <label className="block text-sm font-medium mb-1">
                Category <span className="text-red-600">*required</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value as 'BUSINESS' | 'HOME' | 'VEHICLE')
                  setSelectedAccountId('')
                  setSelectedSubAccount('')
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="BUSINESS">Business</option>
                {transactionType === 'RECEIPT' && (
                  <>
                    <option value="HOME">Home</option>
                    <option value="VEHICLE">Vehicle</option>
                  </>
                )}
              </select>
            </div>

            {selectedCategory === 'BUSINESS' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {transactionType === 'INVOICE' ? 'Income Account' : 'Expense Account'} <span className="text-red-600">*required</span>
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">📁 Select an account...</option>
                  {(accounts.length > 0 ? accounts : fallbackAccounts)
                    .filter(account => {
                      if (transactionType === 'INVOICE') {
                        // For invoices, only show real INCOME accounts from database (8000, 8230)
                        // These must have actual IDs from chart_of_accounts to link properly
                        return account.type === 'INCOME' && (account.code === '8000' || account.code === '8230')
                      } else {
                        // For receipts, show expense accounts BUT exclude HOME (9945 and 9945-*) and VEHICLE (9281 and 9281-*) accounts
                        // Those are handled separately in their own category sections
                        return account.type === 'EXPENSE' &&
                               account.code !== '9945' && !account.code?.startsWith('9945-') &&
                               account.code !== '9281' && !account.code?.startsWith('9281-')
                      }
                    })
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {selectedCategory === 'HOME' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Expense Type <span className="text-red-600">*required</span>
                </label>
                <select
                  value={selectedSubAccount}
                  onChange={(e) => setSelectedSubAccount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">📋 Select expense type...</option>
                  {(accounts.length > 0 ? accounts : fallbackAccounts)
                    .filter(account => account.code?.startsWith('9945-'))
                    .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
                    .map((account) => (
                      <option key={account.id} value={account.name}>
                        {account.name}
                      </option>
                    ))}
                  <option value="Other Expenses">Other Expenses</option>
                </select>
              </div>
            )}

            {selectedCategory === 'VEHICLE' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Vehicle Expense Type <span className="text-red-600">*required</span>
                </label>
                <select
                  value={selectedSubAccount}
                  onChange={(e) => setSelectedSubAccount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">🚗 Select vehicle expense type...</option>
                  {(accounts.length > 0 ? accounts : fallbackAccounts)
                    .filter(account => account.code?.startsWith('9281-'))
                    .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
                    .map((account) => (
                      <option key={account.id} value={account.name}>
                        {account.name}
                      </option>
                    ))}
                  <option value="Other Vehicle Expenses">Other Vehicle Expenses</option>
                </select>
              </div>
            )}

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
              <label className="block text-sm font-medium mb-1">Transaction Type</label>
              <div className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 flex items-center">
                {transactionType === 'INVOICE' ? '💰 Invoice (Income - Money In)' : '🧾 Receipt (Expense - Money Out)'}
              </div>
            </div>

            {/* GST Section - Only if user is registered for GST */}
            {gstRegistered && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-3">Is GST/HST included in the total amount above?</label>
                  <div className="flex flex-wrap gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gst_hst_status"
                        checked={extractedData.gst_hst_applicable !== false && extractedData.gst_hst_included === true}
                        onChange={() => {
                          const rate = defaultGstRate
                          const newGstAmount = extractedData.amount && rate > 0
                            ? (extractedData.amount / (1 + rate / 100)) * (rate / 100)
                            : 0
                          setExtractedData({...extractedData, gst_hst_included: true, gst_hst_applicable: true, gst_hst_rate: rate, gst_hst_amount: parseFloat(newGstAmount.toFixed(2))})
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Yes, tax is included</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gst_hst_status"
                        checked={extractedData.gst_hst_applicable !== false && extractedData.gst_hst_included === false}
                        onChange={() => {
                          const rate = defaultGstRate
                          const newGstAmount = extractedData.amount && rate > 0
                            ? extractedData.amount * rate / 100
                            : 0
                          setExtractedData({...extractedData, gst_hst_included: false, gst_hst_applicable: true, gst_hst_rate: rate, gst_hst_amount: parseFloat(newGstAmount.toFixed(2))})
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">No, tax will be added</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gst_hst_status"
                        checked={extractedData.gst_hst_applicable === false}
                        onChange={() => setExtractedData({...extractedData, gst_hst_applicable: false, gst_hst_rate: 0, gst_hst_amount: 0})}
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
                      onChange={(e) => {
                        const newRate = parseFloat(e.target.value) || 0
                        let newGstAmount = 0
                        if (extractedData.amount && newRate > 0) {
                          if (extractedData.gst_hst_included === true) {
                            // Tax is included in the amount: back-calculate
                            newGstAmount = (extractedData.amount / (1 + newRate / 100)) * (newRate / 100)
                          } else if (extractedData.gst_hst_included === false) {
                            // Tax is NOT included: calculate on top
                            newGstAmount = extractedData.amount * newRate / 100
                          }
                        }
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
                      {extractedData.amount && extractedData.gst_hst_rate ?
                        extractedData.gst_hst_included === true ?
                          `Calculated: $${(((extractedData.amount || 0) / (1 + (extractedData.gst_hst_rate || 0) / 100)) * ((extractedData.gst_hst_rate || 0) / 100)).toFixed(2)} (back-calculated from $${extractedData.amount})` :
                          extractedData.gst_hst_included === false ?
                          `Calculated: $${(((extractedData.amount || 0) * (extractedData.gst_hst_rate || 0) / 100)).toFixed(2)} (added to $${extractedData.amount})` :
                          'Select GST status and enter amount'
                        : 'Enter amount and select GST status'
                      }
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Notice for non-registered users */}
            {!gstRegistered && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  ℹ️ <strong>GST/HST Not Registered</strong> — The total amount you enter is treated as the final amount including any applicable tax.
                </p>
              </div>
            )}

            {/* Summary Breakdown */}
            <div className="border-t pt-4">
              <div className="bg-gray-50 rounded-lg p-4">
                {gstRegistered ? (
                  /* Show 3-column breakdown for GST-registered users */
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Pretax Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${(() => {
                          if (extractedData.gst_hst_applicable === false) {
                            return (extractedData.amount || 0).toFixed(2)
                          } else if (extractedData.gst_hst_included === true && extractedData.gst_hst_rate && extractedData.gst_hst_rate > 0) {
                            return ((extractedData.amount || 0) / (1 + extractedData.gst_hst_rate / 100)).toFixed(2)
                          } else {
                            return (extractedData.amount || 0).toFixed(2)
                          }
                        })()}
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
                        ${(() => {
                          if (extractedData.gst_hst_included === true || extractedData.gst_hst_applicable === false) {
                            return (extractedData.amount || 0).toFixed(2)
                          } else {
                            return ((extractedData.amount || 0) + (extractedData.gst_hst_amount || 0)).toFixed(2)
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Show simple total for non-registered users */
                  <div className="text-center">
                    <p className="text-xs text-gray-600 font-medium mb-2">Total Amount (Tax Included)</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${(extractedData.amount || 0).toFixed(2)}
                    </p>
                  </div>
                )}
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
            disabled={saving || (selectedCategory === 'BUSINESS' && !selectedAccountId) || ((selectedCategory === 'HOME' || selectedCategory === 'VEHICLE') && !selectedSubAccount)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? "Creating transaction..." : "Create Transaction"}
          </button>
        </div>
      </div>
    </div>
  )
}