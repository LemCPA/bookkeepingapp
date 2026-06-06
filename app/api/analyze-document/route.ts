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
            text: `Extract information from this receipt or invoice. This image may be from a mobile camera - focus on clarity and context clues if the image is slightly blurry or at an angle.

FINDING THE AMOUNT (CRITICAL - THIS IS YOUR PRIMARY JOB):
THIS IS THE MOST IMPORTANT FIELD - EXTRACT IT ACCURATELY OR THE USER CANNOT PROCESS THE RECEIPT.

Search for total amounts in this priority order:
1. "Total:" followed by a dollar amount (most common, especially on thermal receipts)
2. "Amount Due", "Total Due", "Balance Due", "Please Pay", "Amount to Pay"
3. "Grand Total", "Net Total", "TOTAL", "Final Total"
4. If multiple dollar amounts exist: look for the BOTTOM-MOST line (totals are at the end)
5. Look for pattern: Subtotal + Tax = Total (use the final number)
6. Look for currency symbol: $ £ € ¥ followed immediately by digits

CRITICAL THERMAL RECEIPT PATTERN:
On thermal receipts, totals often appear as: "Total:        $26.60" or "Total: 26.60"
The amount comes RIGHT AFTER the colon, possibly with spacing
Example on Canada Computers: "Subtotal: $23.54" / "HST: $3.06" / "Total: $26.60" → extract 26.60

DO NOT EXTRACT:
- Line item prices (smaller amounts scattered through middle)
- Subtotals (only extract the final TOTAL)
- Tax amounts alone (extract the final total that includes tax)

Amount must be a real number (26.60, not "26.60" as string)
Strip symbols: $ £ € ¥ commas
Strip leading zeros: "026.60" → 26.60
Valid range: 0.01 to 999999.99

VENDOR NAME (appears near top, often first bold text or business letterhead):
- Look for company/business name near the top of the document
- Often appears in a header, letterhead, or first few lines
- May include suffixes like Ltd, Inc, LLC, Corp, Inc., Ltd.
- Return the business legal name if visible, null if not found

DATE EXTRACTION:
- Extract any date found on the document in whatever format shown
- Formats can be: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, Month DD, YYYY, etc.
- Return as a string without normalization (just extract what you see)

ACCOUNT TYPE (ASSET vs EXPENSE):
- EXPENSE (default): rent, utilities, office supplies, meals, services, subscriptions
- ASSET: equipment, vehicles, property, furniture, tools with useful life > 1 year
- Return: "EXPENSE", "ASSET", or null

GST/HST DETAILS:
- Extract the GST/HST rate if shown (5, 13, etc.)
- Extract the GST/HST amount if shown separately on a "GST", "HST", or "Tax" line
- If not shown: rate=0, amount=0

Now extract and return ONLY this JSON (no markdown, no explanations, no extra text):

{
  "date": "extracted date string or null",
  "amount": <number or null>,
  "description": "what was purchased",
  "vendor_name": "business name or null",
  "type": "RECEIPT or INVOICE or null",
  "account_type": "EXPENSE or ASSET or null",
  "gst_hst_amount": 0,
  "gst_hst_rate": 0
}`,
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

    let base64: string
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'

    // Check if this is JSON (from Snap Document) or FormData (from Documents page or bulk scanner)
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      // JSON input: { image: "base64data" }
      const body = await request.json()
      base64 = body.image

      if (!base64) {
        return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
      }

      // Default to JPEG for JSON input (Snap Document)
      mediaType = 'image/jpeg'
    } else {
      // FormData input: file upload
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
      base64 = Buffer.from(buffer).toString('base64')

      if (file.type === 'image/png') mediaType = 'image/png'
      if (file.type === 'image/gif') mediaType = 'image/gif'
      if (file.type === 'image/webp') mediaType = 'image/webp'
    }

    const response = await analyzeImage(base64, mediaType)

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response from Claude' }, { status: 500 })
    }

    let jsonText = content.text.trim()
    // Log raw response for debugging
    console.log('Claude Vision raw response (first 500 chars):', jsonText.substring(0, 500))

    // Try to extract JSON from markdown code blocks first
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
      console.log('Extracted JSON from markdown code block')
    } else {
      console.log('No markdown code block found, parsing raw text')
    }

    let extractedData
    try {
      extractedData = JSON.parse(jsonText)
      console.log('Successfully parsed JSON')
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON')
      console.error('Raw text:', jsonText.substring(0, 1000))
      console.error('Parse error:', parseError)

      // Try one more time: remove any leading/trailing non-JSON characters
      const jsonStart = jsonText.indexOf('{')
      const jsonEnd = jsonText.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const potentialJson = jsonText.substring(jsonStart, jsonEnd + 1)
        try {
          extractedData = JSON.parse(potentialJson)
          console.log('Successfully parsed JSON after cleaning')
        } catch {
          throw new Error(`Invalid response format from Claude Vision. Expected JSON, got: ${jsonText.substring(0, 200)}`)
        }
      } else {
        throw new Error(`Invalid response format from Claude Vision. Expected JSON, got: ${jsonText.substring(0, 200)}`)
      }
    }

    // Validate and clean extracted data
    // Fix invalid amount values (e.g., "010d" should be null, allowing manual correction)
    if (extractedData.amount !== null && extractedData.amount !== undefined) {
      let amountStr = String(extractedData.amount).trim()

      // Remove common OCR artifacts and cleanup
      // Replace common OCR misreadings: O->0, l->1, I->1, S->5, Z->2, etc.
      amountStr = amountStr.replace(/[OI]/g, '0').replace(/l/g, '1').replace(/[S]/g, '5').replace(/Z/g, '2')

      // Remove any non-numeric characters except decimal point
      amountStr = amountStr.replace(/[^\d.]/g, '')

      // Handle multiple decimals (keep only one)
      const parts = amountStr.split('.')
      if (parts.length > 2) {
        amountStr = parts[0] + '.' + parts.slice(1).join('')
      }

      // Remove leading zeros before decimal point (e.g., "026.60" -> "26.60")
      // But preserve "0.xx" format (e.g., "0.50" should stay "0.50")
      if (amountStr.includes('.')) {
        const [beforeDecimal, afterDecimal] = amountStr.split('.')
        const cleanedBeforeDecimal = beforeDecimal.replace(/^0+/, '') || '0'
        amountStr = cleanedBeforeDecimal + '.' + afterDecimal
      } else {
        amountStr = amountStr.replace(/^0+/, '') || '0'
      }

      const amount = Number(amountStr)

      if (isNaN(amount) || amountStr === '') {
        console.warn('Invalid amount extracted (NaN after cleanup):', extractedData.amount, 'cleaned to:', amountStr, '- setting to null')
        extractedData.amount = null
      } else if (amount === 0) {
        // 0 is almost never a valid total - extraction likely failed
        console.warn('Amount extracted as 0 - treating as extraction failure. Raw value was:', extractedData.amount)
        // Set to null so user sees empty field and knows extraction failed
        extractedData.amount = null
      } else if (amount < 0.01 || amount > 999999.99) {
        // Amount is unreasonable (less than 1 cent or more than $999,999.99)
        console.warn('Amount extracted is out of reasonable range:', amount, '- setting to null')
        extractedData.amount = null
      } else {
        extractedData.amount = amount
      }
    }

    // Log the final extracted data for debugging
    console.log('Final extracted data:', {
      date: extractedData.date,
      amount: extractedData.amount,
      vendor: extractedData.vendor_name,
      type: extractedData.type,
      description: extractedData.description,
      gst_hst_rate: extractedData.gst_hst_rate,
      gst_hst_amount: extractedData.gst_hst_amount
    })

    if (!extractedData.amount || extractedData.amount === 0) {
      console.warn('⚠️ NO AMOUNT EXTRACTED - Claude returned:', extractedData.amount, '- User will need to enter manually')
      console.warn('⚠️ Raw extracted value was:', extractedData.amount)
    } else if (extractedData.amount < 1) {
      console.warn('⚠️ SUSPICIOUSLY LOW AMOUNT:', extractedData.amount, '- may be extraction error')
    } else {
      console.log('✅ Amount successfully extracted:', extractedData.amount)
    }

    // Log extracted data for debugging
    console.log('Extracted data (validated):', extractedData)

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
