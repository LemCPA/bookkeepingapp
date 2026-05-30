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
            text: `Analyze this receipt or invoice image and extract CRITICAL financial information in JSON format:
{
  "date": "YYYY-MM-DD (from the document, or today if not found)",
  "amount": "numeric amount as number (e.g., 150.50) - this should be the TOTAL amount including tax",
  "description": "brief description of what was purchased or service provided",
  "vendor_name": "name of the vendor/company",
  "type": "RECEIPT or INVOICE (determine from context)",
  "account_type": "ASSET or EXPENSE (best guess based on content)",
  "gst_hst_amount": "numeric GST/HST amount extracted (0 if not found)",
  "gst_hst_rate": "GST/HST rate as number (5 for 5% GST, 13 for 13% HST, 0 if no GST/HST)"
}

TOTAL AMOUNT EXTRACTION (CRITICAL - DO NOT MISS):
1. Scan the ENTIRE document from bottom to top (totals are usually at the end)
2. Look for these keywords: "Total", "Invoice Total", "Grand Total", "TOTAL", "Amount Due", "Total Due", "TOTAL AMOUNT", "$" with largest number
3. The TOTAL is the LARGEST dollar amount on the document (excluding item-level prices if itemized)
4. Must include tax/GST/HST in the total amount
5. Return as a number: 62.15 (not "$62.15", not "62.15 CAD", not a string)
6. If you find "Subtotal" and "Total": use the TOTAL value (the larger one)
7. If no explicit "Total" label found: use the largest single dollar amount that appears to be a final sum

GST/HST EXTRACTION (CRITICAL):
- Look for ANY mention of tax: "GST", "HST", "Sales Tax", "Total Tax", "Tax Amount", "Taxe", "Impôt", "Tax", "Taxes"
- Look for subtotal + tax = total patterns to identify tax amount
- If you see "Subtotal" and "Total", calculate: tax amount = Total - Subtotal
- Extract the TOTAL GST/HST amount, not per-line taxes
- For 5% GST: set rate to 5 and amount to the GST total
- For 13% HST: set rate to 13 and amount to the HST total
- If both GST and PST/QST are present, add them together for the total amount, set rate to sum (e.g., 12 for 5% GST + 7% PST)
- Search the entire document carefully for tax information - it might be in small text, at bottom, or in different sections
- If no explicit tax found but document has multiple currencies or looks like it's a cross-border transaction, check for implicit tax
- If no GST/HST found after thorough search: set both amount and rate to 0
- Only Canadian tax rates are expected (0, 5, 7, 12, or 13)

GENERAL RULES:
- Extract ONLY the JSON object, nothing else - no markdown, no explanation
- If a field cannot be determined, use null (except gst_hst_amount and gst_hst_rate, which default to 0)
- Amount should be a number, not a string
- Type should be either "RECEIPT" or "INVOICE"
- Account type should be either "ASSET" (for deposits/income) or "EXPENSE" (for payments/costs)`,
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
