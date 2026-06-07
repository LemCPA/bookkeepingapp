import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFileSync } from 'fs'
import { getDb, saveDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

let client: any = null

function getApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY
  }
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/)
    if (match) {
      return match[1].trim()
    }
  } catch (e) {
    console.error('Could not read .env.local:', e)
  }
  return undefined
}

async function getClient() {
  if (!client) {
    const { Anthropic } = await import('@anthropic-ai/sdk')
    const apiKey = getApiKey()
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

interface ExtractedTransaction {
  date: string | null
  amount: number | null
  description: string | null
  vendor_name: string | null
  type: 'INVOICE' | 'RECEIPT' | 'ADJUSTMENT' | null
  gst_hst_amount: number
  gst_hst_rate: number
}

async function saveTransactionToSupabase(
  userId: number,
  accountId: number,
  date: string,
  amount: number,
  gstHstRate: number,
  gstHstAmount: number,
  description: string,
  type: string
): Promise<boolean> {
  try {
    const result = await createTransactionInSupabase(
      userId,
      0, // clientId - set to 0 for now
      accountId,
      date,
      amount,
      gstHstRate,
      gstHstAmount,
      description,
      type,
      '' // reference_number
    )

    if (result) {
      console.log(`[BULK-SCAN] Transaction saved to Supabase successfully`)
      return true
    } else {
      console.error(`[BULK-SCAN] Supabase returned null/falsy for transaction creation`)
      return false
    }
  } catch (error) {
    console.error(`[BULK-SCAN] Exception saving to Supabase:`, error)
    return false
  }
}

async function analyzeDocument(fileBuffer: Buffer, fileName: string): Promise<ExtractedTransaction | null> {
  try {
    console.log(`[${fileName}] Starting document analysis, buffer size: ${fileBuffer.length} bytes`)

    const ext = path.extname(fileName).toLowerCase()
    const base64Data = fileBuffer.toString('base64')

    // Handle images and PDFs
    const supportedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const supportedPdfTypes = ['.pdf']

    if (!supportedImageTypes.includes(ext) && !supportedPdfTypes.includes(ext)) {
      console.log(`[${fileName}] Unsupported file type: ${ext}`)
      return null
    }

    console.log(`[${fileName}] Analyzing as ${ext === '.pdf' ? 'PDF' : 'image'}`)

    const anthropic = await getClient()

    // Build content array based on file type
    const content: any[] = []

    if (ext === '.pdf') {
      // PDF documents
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Data,
        },
      })
    } else {
      // Image files
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
      if (ext === '.png') mediaType = 'image/png'
      if (ext === '.gif') mediaType = 'image/gif'
      if (ext === '.webp') mediaType = 'image/webp'

      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      })
    }

    content.push({
      type: 'text',
      text: `Analyze this receipt or invoice document and extract the following information in JSON format:
{
  "date": "YYYY-MM-DD (from the document, or today if not found)",
  "amount": "numeric amount as number (e.g., 150.50) - this should be the TOTAL amount including tax",
  "description": "brief description of what was purchased or service provided",
  "vendor_name": "name of the vendor/company",
  "type": "RECEIPT or INVOICE (determine from context)",
  "gst_hst_amount": "numeric GST/HST amount extracted (0 if not found)",
  "gst_hst_rate": "GST/HST rate as number (5 for 5% GST, 13 for 13% HST, 0 if no GST/HST)"
}

Important:
- Extract ONLY the JSON object, nothing else
- If a field cannot be determined, use null
- Amount should be a number, not a string
- Type should be either "RECEIPT" or "INVOICE"
- GST/HST Extraction:
  * Look for ANY mention of tax: "GST", "HST", "Sales Tax", "Total Tax", "Tax Amount", "Taxe", "Impôt"
  * Look for subtotal + tax = total patterns to identify tax amount
  * If you see "Subtotal" and "Total", calculate: tax amount = Total - Subtotal
  * Extract the TOTAL GST/HST amount, not per-line taxes
  * For 5% GST: set rate to 5 and amount to the GST total
  * For 13% HST: set rate to 13 and amount to the HST total
  * If no GST/HST found after thorough search: set both amount and rate to 0
- Only Canadian tax rates are expected (0, 5, 7, 12, or 13)`,
    })

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: content as any,
        },
      ],
    })

    const responseContent = response.content[0]
    if (responseContent.type !== 'text') {
      console.error(`[${fileName}] Response not text, type: ${responseContent.type}`)
      return null
    }

    console.log(`[${fileName}] Claude response (first 300 chars):`, responseContent.text.substring(0, 300))

    // Parse JSON - handle both plain JSON and markdown code blocks
    let jsonText = responseContent.text
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    } else {
      // Try to extract plain JSON object
      const plainJsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!plainJsonMatch) {
        console.error(`[${fileName}] No JSON found in response:`, responseContent.text)
        return null
      }
      jsonText = plainJsonMatch[0]
    }

    const extracted = JSON.parse(jsonText) as ExtractedTransaction
    return extracted
  } catch (error) {
    console.error(`Error analyzing ${fileName}:`, error)
    if (error instanceof Error) {
      console.error(`  Details: ${error.message}`)
    }
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[BULK-SCAN] Starting document analysis')

    // Extract user ID from Authorization header
    let userId = getUserIdFromRequest(request)
    console.log('[BULK-SCAN] userId from auth:', userId)

    // If no userId from auth, use demo account (user ID 1) for development/demo purposes
    if (!userId) {
      const authHeader = request.headers.get('Authorization')
      console.log('[BULK-SCAN] WARNING: No userId from auth. Auth header present:', !!authHeader)
      console.log('[BULK-SCAN] Using demo account (user ID 1) as fallback')
      userId = 1  // Demo account fallback
    }

    console.log('[BULK-SCAN] Got userId:', userId, '- parsing formData')
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    console.log('[BULK-SCAN] Files received:', files.length, 'files')

    if (!files || files.length === 0) {
      const allKeys = Array.from(formData.keys())
      console.log('[BULK-SCAN] FAILED: No files. FormData keys:', allKeys)
      return NextResponse.json(
        { error: 'No files provided in request' },
        { status: 400 }
      )
    }

    console.log('[BULK-SCAN] Proceeding with analysis of', files.length, 'files')

    const db = getDb()
    let analyzedCount = 0
    const results: any[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        const fileBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(fileBuffer)

        // Validate file size
        if (buffer.length === 0) {
          errors.push(`${file.name}: File is empty`)
          continue
        }

        // Analyze document
        const extracted = await analyzeDocument(buffer, file.name)
        if (!extracted) {
          errors.push(`${file.name}: Could not read document (may be too dark, blurry, or unclear). Try taking a clearer photo.`)
          continue
        }

        // Apply defaults for null fields (matching Snap Document behavior)
        const date = extracted.date || new Date().toISOString().split('T')[0]
        const amount = extracted.amount ?? 0
        const description = extracted.description || extracted.vendor_name || 'Unknown'
        const type = (extracted.type === 'INVOICE' || extracted.type === 'RECEIPT') ? extracted.type : 'RECEIPT'
        const vendor_name = extracted.vendor_name || 'Unknown'

        // Find appropriate account for this user
        let accountId: number | null = null
        if (type === 'INVOICE') {
          const arAccount = db.chart_of_accounts.find(a => a.name.includes('Accounts Receivable') && a.user_id === userId)
          accountId = arAccount?.id || db.chart_of_accounts.find(a => a.type === 'ASSET' && a.user_id === userId)?.id || null
        } else {
          const apAccount = db.chart_of_accounts.find(a => a.name.includes('Accounts Payable') && a.user_id === userId)
          accountId = apAccount?.id || db.chart_of_accounts.find(a => a.type === 'LIABILITY' && a.user_id === userId)?.id || null
        }

        if (!accountId) {
          errors.push(`${file.name}: Could not find appropriate account`)
          continue
        }

        // Calculate due date
        const txnDate = new Date(date)
        const dueDate = new Date(txnDate)
        dueDate.setDate(dueDate.getDate() + 30)

        // Create transaction
        const transactionId = db.nextTransactionId++
        const transaction = {
          id: transactionId,
          user_id: userId,
          account_id: accountId,
          transaction_date: date,
          amount: amount,
          description: description,
          type: type,
          reference_number: '',
          gst_hst_rate: extracted.gst_hst_rate || 0,
          gst_hst_amount: extracted.gst_hst_amount || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          due_date: dueDate.toISOString().split('T')[0],
          reconciliation_status: '',
        }
        db.transactions.push(transaction)

        // Also save to Supabase for production persistence
        const supabaseSuccess = await saveTransactionToSupabase(
          userId,
          accountId,
          date,
          amount,
          extracted.gst_hst_rate || 0,
          extracted.gst_hst_amount || 0,
          description,
          type
        )

        // In production, ALWAYS require Supabase persistence
        const isProduction = process.env.NODE_ENV === 'production'
        if (!supabaseSuccess && isProduction) {
          console.error(`[BULK-SCAN] CRITICAL: Failed to save transaction to Supabase in production`)
          errors.push(`${file.name}: Failed to persist data to database. Please try again.`)
          // Remove the transaction we added to in-memory DB since it won't persist
          db.transactions = db.transactions.filter(t => t.id !== transactionId)
          analyzedCount--
          continue
        }

        if (!supabaseSuccess && !isProduction) {
          // Development: warn but allow JSON fallback
          console.warn(`[BULK-SCAN] Supabase save failed in dev, falling back to JSON`)
        }

        results.push({
          fileName: file.name,
          transactionId,
          amount: amount,
          vendor: vendor_name,
          type: type,
        })

        analyzedCount++
      } catch (error) {
        errors.push(`${file.name}: ${error}`)
      }
    }

    // Save database
    saveDb(db)

    // Return appropriate status code
    const statusCode = analyzedCount === 0 ? 400 : (errors.length > 0 ? 207 : 200)
    const response = {
      analyzedCount,
      totalCount: files.length,
      results: analyzedCount > 0 ? results : undefined,
      errors: errors.length > 0 ? errors : undefined,
      message: analyzedCount === 0
        ? 'No documents could be processed'
        : `Successfully analyzed ${analyzedCount} document(s)${errors.length > 0 ? ` (${errors.length} error(s))` : ''}`,
    }

    console.log(`[BULK-SCAN] Final response: ${analyzedCount} analyzed, ${errors.length} errors`)
    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    console.error('Error scanning documents:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)
    console.error('Full error:', error)
    return NextResponse.json(
      {
        error: 'Failed to scan documents',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
