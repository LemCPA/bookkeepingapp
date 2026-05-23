import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getDb, saveDb } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth-server'

let client: any = null

async function getClient() {
  if (!client) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    client = new Anthropic()
  }
  return client
}

interface ExtractedTransaction {
  date: string
  amount: number
  description: string
  vendor_name: string
  type: 'INVOICE' | 'RECEIPT' | 'ADJUSTMENT'
  gst_hst_amount: number
  gst_hst_rate: number
}


async function analyzeDocument(fileBuffer: Buffer, fileName: string): Promise<ExtractedTransaction | null> {
  try {
    console.log(`[${fileName}] Starting document analysis, buffer size: ${fileBuffer.length} bytes`)

    // Determine media type from file extension
    const ext = path.extname(fileName).toLowerCase()
    console.log(`[${fileName}] File extension: ${ext}`)

    const base64Data = fileBuffer.toString('base64')
    let mediaType: 'image/jpeg' | 'image/png' | 'application/pdf' = 'image/jpeg'

    if (ext === '.png') {
      console.log(`[${fileName}] PNG file detected`)
      mediaType = 'image/png'
    } else if (ext === '.pdf') {
      console.log(`[${fileName}] PDF file detected, sending directly to Claude`)
      mediaType = 'application/pdf'
    } else {
      console.log(`[${fileName}] Assuming JPEG format`)
    }

    console.log(`[${fileName}] Preparing Claude API request, mediaType: ${mediaType}, base64 size: ${base64Data.length} bytes`)

    // For PDFs, use the document type; for images, use the image type
    const messageContent: any[] = []

    if (mediaType === 'application/pdf') {
      messageContent.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Data,
        },
      })
    } else {
      messageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      })
    }

    messageContent.push({
      type: 'text',
      text: `Analyze this receipt or invoice and extract the following information in JSON format:
{
  "date": "YYYY-MM-DD",
  "amount": number (total amount),
  "description": "brief description of what was purchased",
  "vendor_name": "name of vendor/business",
  "type": "RECEIPT or INVOICE",
  "gst_hst_amount": number (extracted GST/HST amount, 0 if none),
  "gst_hst_rate": number (5 for GST, 13 for HST, 0 if none)
}

If this is a receipt (you're paying), mark as RECEIPT.
If this is an invoice (someone owes you), mark as INVOICE.
For Canadian taxes, extract GST (5%) or HST (13%) if visible.
Return ONLY valid JSON, no other text.`,
    })

    console.log(`[${fileName}] Calling Claude API...`)
    const anthropic = await getClient()
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      console.error(`[${fileName}] Response not text, type: ${content.type}`)
      return null
    }

    console.log(`[${fileName}] Claude response:`, content.text.substring(0, 200))

    // Parse the JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`[${fileName}] No JSON found in response:`, content.text)
      return null
    }

    try {
      const extracted = JSON.parse(jsonMatch[0]) as ExtractedTransaction
      return extracted
    } catch (parseError) {
      console.error(`Failed to parse JSON for ${fileName}:`, jsonMatch[0], parseError)
      return null
    }
  } catch (error) {
    console.error(`Error analyzing ${fileName}:`, error)
    // Return a more helpful error message
    if (error instanceof Error) {
      console.error(`  Details: ${error.message}`)
    }
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    const db = getDb()
    let analyzedCount = 0
    const results: any[] = []
    const errors: string[] = []

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    for (const file of files) {
      try {
        const fileBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(fileBuffer)

        // Analyze document
        const extracted = await analyzeDocument(buffer, file.name)
        if (!extracted) {
          errors.push(`${file.name}: Could not extract data from document`)
          continue
        }

        // Find appropriate account for this user
        let accountId: number | null = null
        if (extracted.type === 'INVOICE') {
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
        const txnDate = new Date(extracted.date)
        const dueDate = new Date(txnDate)
        dueDate.setDate(dueDate.getDate() + 30)

        // Create transaction
        const transactionId = db.nextTransactionId++
        const transaction = {
          id: transactionId,
          user_id: userId,
          account_id: accountId,
          transaction_date: extracted.date,
          amount: extracted.amount,
          description: extracted.description,
          type: extracted.type,
          reference_number: '',
          gst_hst_rate: extracted.gst_hst_rate,
          gst_hst_amount: extracted.gst_hst_amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          due_date: dueDate.toISOString().split('T')[0],
          reconciliation_status: '',
        }
        db.transactions.push(transaction)

        // Save document file
        const userUploadDir = path.join(uploadsDir, `user-${userId}`)
        if (!fs.existsSync(userUploadDir)) {
          fs.mkdirSync(userUploadDir, { recursive: true })
        }

        const fileName = `${transactionId}-${Date.now()}-${file.name}`
        const filePath = path.join(userUploadDir, fileName)
        fs.writeFileSync(filePath, buffer)

        // Create document record
        const documentId = db.nextDocumentId++
        db.documents.push({
          id: documentId,
          transaction_id: transactionId,
          file_name: file.name,
          file_path: `/uploads/user-${userId}/${fileName}`,
          file_size: buffer.length,
          uploaded_at: new Date().toISOString(),
        })

        results.push({
          fileName: file.name,
          transactionId,
          amount: extracted.amount,
          vendor: extracted.vendor_name,
          type: extracted.type,
        })

        analyzedCount++
      } catch (error) {
        errors.push(`${file.name}: ${error}`)
      }
    }

    // Save database
    saveDb(db)

    return NextResponse.json({
      analyzedCount,
      totalCount: files.length,
      results: analyzedCount > 0 ? results : undefined,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully analyzed ${analyzedCount} document(s)`,
    })
  } catch (error) {
    console.error('Error scanning documents:', error)
    return NextResponse.json(
      { error: 'Failed to scan documents' },
      { status: 500 }
    )
  }
}
