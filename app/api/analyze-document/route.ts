import { NextRequest, NextResponse } from 'next/server'
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

let client: any = null

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

async function analyzeImage(base64: string, mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') {
  const client = await getClient()
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
            text: `CRITICAL: Extract invoice/receipt financial data. Return ONLY valid JSON, nothing else.

Return format:
{
  "date": "YYYY-MM-DD",
  "amount": <number, the invoice total>,
  "description": "what was purchased",
  "vendor_name": "company name",
  "type": "RECEIPT or INVOICE",
  "account_type": "ASSET or EXPENSE",
  "gst_hst_amount": <number, 0 if not found>,
  "gst_hst_rate": <number: 0, 5, 7, 12, or 13>
}

AMOUNT EXTRACTION - HIGHEST PRIORITY:
Step 1: Find all dollar amounts ($XX.XX pattern) on the entire document
Step 2: Identify which line contains "Total", "Invoice Total", "TOTAL", "Amount Due", or "INVOICE TOTAL:"
Step 3: The amount is the LARGEST dollar value on the page (usually at bottom)
Step 4: Return as NUMBER only: 62.15 (NOT string, NOT "$", NOT "CAD")
Step 5: MUST include tax in the total - this is the final amount owed
Step 6: If "Subtotal: $X" and "Total: $Y", use Total (the bigger one)
Step 7: If multiple large numbers, use the one next to "Total" or "Amount Due"
Step 8: CRITICAL: Do not return 0 unless you literally cannot find ANY dollar amount. Return null instead of 0 if completely missing.

TAX EXTRACTION:
- Find "GST", "HST", "PST", "QST", "Tax:", "Total Tax"
- If "Subtotal: $X" and "Total: $Y": Tax = Y - X
- Identify rate: 5% (GST), 13% (HST), 7% (PST), etc.
- Return tax amount (numeric) and rate separately
- If no tax found: amount=0, rate=0

RULES:
- Return ONLY JSON object - no markdown, no text, no explanation
- All numeric fields must be numbers (not strings)
- Date format: YYYY-MM-DD
- If field missing: use null (except tax fields default to 0)`,
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
    // Log raw response for debugging
    console.log('Claude Vision raw response:', jsonText)

    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    let extractedData
    try {
      extractedData = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', jsonText)
      throw new Error('Invalid response format from Claude Vision')
    }

    // Log extracted data for debugging
    console.log('Extracted data:', extractedData)

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
