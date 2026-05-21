import { NextRequest, NextResponse } from 'next/server'
import { Anthropic } from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getUserIdFromRequest } from '@/lib/auth-server'

// Load API key from .env.local or environment
function getApiKey(): string | undefined {
  // First try environment variable
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY
  }

  // Try reading from .env.local file
  try {
    const envPath = join(process.cwd(), '.env.local')
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

const apiKey = getApiKey()
const client = new Anthropic({
  apiKey: apiKey,
})

async function analyzeImage(base64: string, mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') {
  const response = await client.messages.create({
    model: 'claude-opus-4-1-20250805',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Analyze this receipt or invoice image and extract the following information in JSON format:
{
  "date": "YYYY-MM-DD (from the document, or today if not found)",
  "amount": "numeric amount as number (e.g., 150.50)",
  "description": "brief description of what was purchased or service provided",
  "vendor_name": "name of the vendor/company",
  "type": "RECEIPT or INVOICE (determine from context)",
  "account_type": "ASSET or EXPENSE (best guess based on content)",
  "gst_hst_amount": "numeric GST/HST amount extracted (0 if not found)",
  "gst_hst_rate": "GST/HST rate as number (5 for 5% GST, 13 for 13% HST, 0 if no GST/HST)"
}

Important:
- Extract ONLY the JSON object, nothing else
- If a field cannot be determined, use null (except gst_hst_amount and gst_hst_rate, which default to 0)
- Amount should be a number, not a string
- Type should be either "RECEIPT" or "INVOICE"
- Account type should be either "ASSET" (for deposits/income) or "EXPENSE" (for payments/costs)
- GST/HST Extraction:
  * Look for lines labeled "GST", "HST", "Sales Tax", "Total Tax" on the receipt/invoice
  * Extract only the TOTAL GST/HST amount, not per-line taxes
  * For 5% GST: set rate to 5 and amount to the GST total
  * For 13% HST: set rate to 13 and amount to the HST total
  * If both GST and PST/QST are present, add them together for the total amount, set rate to sum (e.g., 12 for 5% GST + 7% PST)
  * If no GST/HST found: set both amount and rate to 0
  * If tax information is ambiguous or unclear: default to 0
- Only Canadian tax rates are expected (0, 5, or 13)`,
          },
        ],
      },
    ],
  })

  return response
}

export async function POST(request: NextRequest) {
  try {
    // Extract user ID from Authorization header
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Handle image files only
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Unsupported file type. Please use JPG, PNG, GIF, or WebP.',
      }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
    if (file.type === 'image/png') mediaType = 'image/png'
    if (file.type === 'image/gif') mediaType = 'image/gif'
    if (file.type === 'image/webp') mediaType = 'image/webp'

    const response = await analyzeImage(base64, mediaType)

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response from Claude' }, { status: 500 })
    }

    let jsonText = content.text
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    const extractedData = JSON.parse(jsonText)

    return NextResponse.json({
      success: true,
      data: extractedData,
      userId,
    })
  } catch (error: any) {
    console.error('Document analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze document' },
      { status: 500 }
    )
  }
}
