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
            text: `Extract receipt/invoice data. Return ONLY JSON object, no other text.

{
  "date": "YYYY-MM-DD or null",
  "amount": <number or null>,
  "description": "what was purchased/service",
  "vendor_name": "company/business name or null",
  "type": "RECEIPT or INVOICE or null",
  "account_type": "ASSET or EXPENSE or null",
  "gst_hst_amount": 0,
  "gst_hst_rate": 0
}

VENDOR NAME - HIGH PRIORITY:
1. Look at TOP of document for company/business name
2. Check for bold/large text near top
3. Look for business address (gives clue to company name)
4. Examples: "ExecuSpace North York", "Tim Hortons", "Staples"
5. Return the BUSINESS/COMPANY NAME that issued the receipt
6. If not found: use null (NOT empty string)

DOCUMENT TYPE (RECEIPT vs INVOICE):
- RECEIPT = Document from vendor (I received a bill, I paid money out) → EXPENSE
- INVOICE = Document to customer (customer owes me money) → INCOME
- Look at context: Does it say "Invoice To:" or "Bill To:" (mine - INVOICE) vs "From:" (their bill - RECEIPT)
- This is a RECEIPT if it's from a vendor/supplier to me
- Return: "RECEIPT" or "INVOICE" or null

ACCOUNT TYPE (ASSET vs EXPENSE):
- EXPENSE: rent, utilities, supplies, services, food, office space, etc.
- ASSET: equipment, vehicles, property, inventory purchase, etc.
- Look at what was purchased and categorize accordingly
- Most vendor receipts are EXPENSE
- Return: "EXPENSE" or "ASSET" or null

TOTAL AMOUNT:
1. Find largest dollar amount ($XX.XX format)
2. Look for "Total", "Invoice Total", "Amount Due"
3. Return as NUMBER: 62.15 (not string)
4. Include tax in this total
5. If cannot find: return null (not 0)

DATE:
1. Look for invoice date, transaction date, or bill date
2. Format: YYYY-MM-DD
3. Common locations: near company name (top), in header, or below invoice #
4. If not found: return null (not today's date)

TAX:
1. Find "GST", "HST", "PST", "QST", "Tax", "Total Tax"
2. Return amount (number) and rate (5, 7, 13, etc.)
3. If not found: both = 0

RETURN ONLY JSON - no markdown, explanations, or extra text`,
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
