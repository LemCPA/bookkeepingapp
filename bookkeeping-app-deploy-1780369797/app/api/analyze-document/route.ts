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

VENDOR NAME - CRITICAL (Extract before anything else):
1. FIRST: Look at the very TOP of the document (first 20% of page)
2. Look for: Company logo, business header, large bold text
3. Check for: Company name in a box, banner, or stamp
4. Look for: Business address which indicates the company name
5. Look for: Merchant name on credit card receipts
6. Examples of where found: "ExecuSpace North York" (header), "Tim Hortons" (logo area), "Staples Canada" (top banner)
7. CRITICAL: The vendor is the BUSINESS that ISSUED this receipt to me
8. NOT the customer (that's me)
9. If you see any text that looks like a company/business name: EXTRACT IT
10. Do not return null if you see ANY business-like name at top
11. Return as simple string: "CompanyName" (no "From:" or extra text)
12. If truly cannot find: return null

DOCUMENT TYPE (RECEIPT vs INVOICE):
- Ask yourself: "Did I BUY from this business?" (Yes = RECEIPT) or "Did I SELL to a customer?" (No = INVOICE)
- RECEIPT: Document issued TO ME by a vendor/store/service provider showing what I paid
- INVOICE: Document issued BY ME to a customer showing what they owe
- Check for key words:
  * "Invoice To:" or "Bill To:" followed by MY info = I created this (INVOICE)
  * "From:" or "Sold By:" followed by vendor = They sold to me (RECEIPT)
  * No clear indicator = Most likely RECEIPT (95% of scanned docs are receipts)
- Return: "RECEIPT" if I received this from a vendor, "INVOICE" if I created it, null if truly ambiguous

ACCOUNT TYPE (ASSET vs EXPENSE):
- EXPENSE (most common): rent, utilities, office supplies, meals, services, subscriptions
- ASSET (less common): equipment, vehicles, property, furniture, tools with useful life > 1 year
- Items purchased: If unclear, default to EXPENSE
- Return: "EXPENSE" or "ASSET" or null

TOTAL AMOUNT:
1. Find the LARGEST dollar amount ($XX.XX format)
2. Look for "Total", "Invoice Total", "Amount Due", "TOTAL"
3. Return as NUMBER: 62.15 (not string, not "$62.15")
4. Include tax in this total (don't subtract)
5. If cannot find: return null (not 0, not empty)

DATE:
1. Look for: Invoice Date, Transaction Date, Bill Date, or Date field
2. Format: YYYY-MM-DD (e.g., "2026-05-24")
3. Common locations: Near company name (top), in header, near invoice number, at bottom
4. Do not use today's date if not found
5. If not found: return null

TAX (GST/HST):
1. Find "GST", "HST", "PST", "QST", or "Tax" label
2. GST (5%) = Federal, HST (13%) = most provinces, PST = BC
3. Return gst_hst_amount as number (e.g., 7.15 for $7.15)
4. Return gst_hst_rate as number (e.g., 13 for 13%)
5. If not found: both = 0

DEBUGGING NOTES:
- If you find a business name but aren't 100% sure it's the vendor, still return it with high confidence
- Better to extract something plausible than return null
- The user can edit if wrong

RETURN ONLY JSON - no markdown, explanations, code blocks, or extra text`,
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
