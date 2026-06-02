import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import fs from 'fs'
import path from 'path'

const SYSTEM_PROMPT = `You are a helpful assistant for a Canadian bookkeeping application. You help users understand how to use the app effectively.

The app includes these features:
- Transaction Management: Record income and expenses, categorize them, add receipts/documents
- Receipt Scanning: Take photos of receipts - AI automatically extracts date, amount, vendor, tax info
- Vehicle Expense Tracking: Track vehicle expenses separately for T2125 reporting, with business-use percentage calculation
- Recurring Transactions: Set up templates for regular payments (rent, insurance, payroll, etc)
- Invoicing: Create and send invoices to clients
- Bank Reconciliation: Match transactions to bank statements
- Financial Reports: Balance sheets, income statements, vehicle expenses report, A/R aging, A/P aging, GST filing, trends
- Chart of Accounts: Manage accounting categories
- Canadian Tax Support: Full GST/HST and provincial PST support for all provinces

Key Features to Help Users With:
1. Receipt Scanning - fastest way to record expenses
2. New Transaction - manually enter income/expense
3. Vehicle Expense Tracking - flag expenses as vehicle-related for T2125 compliance
4. Recurring Transactions - set up repeating payments
5. Reports - view financial data and tax info, including vehicle expense deductions
6. Reconciliation - match bank records

When helping users:
- Be friendly and supportive
- Give step-by-step instructions when needed
- Suggest using Receipt Scanning for quick expense entry
- For vehicle expenses, remind users to flag them at receipt time and set business-use percentage in the Vehicle Expenses report
- Mention how to access features from the navigation menu
- Explain tax handling for different Canadian provinces, including T2125 requirements
- Keep responses concise but thorough
- Do not use emojis, asterisks, hashtags, or special formatting symbols
- Use plain text only

Always respond in a helpful, encouraging tone.`

function getApiKey(): string | undefined {
  // First try process.env (normal Next.js .env loading)
  let apiKey = process.env.ANTHROPIC_API_KEY

  // Fallback: read directly from .env.local if not set
  if (!apiKey) {
    try {
      const envPath = path.join(process.cwd(), '.env.local')
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8')
        const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m)
        if (match && match[1]) {
          apiKey = match[1].trim()
        }
      }
    } catch (e) {
      console.error('[CHAT] Failed to read .env.local:', e)
    }
  }

  return apiKey
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    console.log('[CHAT API] Request:', {
      hasAuthHeader: !!authHeader,
      authPreview: authHeader ? `${authHeader.substring(0, 30)}...` : 'missing',
    })

    const userId = getUserIdFromRequest(request)
    console.log('[CHAT API] Auth check:', {
      userId,
      userIdExists: !!userId,
    })

    if (!userId) {
      console.log('[CHAT API] Rejecting: No user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, conversationHistory } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ reply: 'Please send a valid message.' }, { status: 200 })
    }

    const apiKey = getApiKey()
    if (!apiKey) {
      console.error('[CHAT] ANTHROPIC_API_KEY is not set and could not be loaded from .env.local')
      return NextResponse.json({
        reply: 'Chat service is not configured. Please contact support.',
        success: false,
      })
    }

    const messages = [
      ...(conversationHistory || []),
      { role: 'user', content: message },
    ]

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-1-20250805',
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: messages,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[CHAT] API error response:', response.status, errorData)

        if (response.status === 401) {
          return NextResponse.json({
            reply: 'Chat service authentication failed. Please check the API key.',
            success: false,
          })
        }

        return NextResponse.json({
          reply: 'I had trouble processing that. Could you try again?',
          success: false,
        })
      }

      const data = await response.json()
      const reply =
        data.content?.[0]?.type === 'text'
          ? data.content[0].text
          : 'I understood your question but had trouble responding. Please try again.'

      return NextResponse.json({
        reply: reply,
        success: true,
      })
    } catch (fetchError: any) {
      console.error('[CHAT] Fetch error:', fetchError.message)
      return NextResponse.json({
        reply: 'Sorry, I had trouble understanding that. Could you rephrase your question?',
        success: false,
      })
    }
  } catch (error: any) {
    console.error('[CHAT] Handler error:', error.message)
    return NextResponse.json(
      { reply: 'Sorry, something went wrong. Please try again.' },
      { status: 200 }
    )
  }
}
