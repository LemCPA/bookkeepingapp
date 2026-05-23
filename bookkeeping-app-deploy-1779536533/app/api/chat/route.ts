import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-server'
import { readFileSync } from 'fs'
import { join } from 'path'

function getApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY
  }

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
    // Lazy load Anthropic only when needed
    const { Anthropic } = await import('@anthropic-ai/sdk')
    const apiKey = getApiKey()
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

const SYSTEM_PROMPT = `You are a helpful assistant for a Canadian bookkeeping application. You help users understand how to use the app effectively.

The app includes these features:
- Transaction Management: Record income and expenses, categorize them, add receipts/documents
- Receipt Scanning: Take photos of receipts - AI automatically extracts date, amount, vendor, tax info
- Recurring Transactions: Set up templates for regular payments (rent, insurance, payroll, etc)
- Invoicing: Create and send invoices to clients
- Bank Reconciliation: Match transactions to bank statements
- Financial Reports: Balance sheets, income statements, A/R aging, A/P aging, GST filing, trends
- Chart of Accounts: Manage accounting categories
- Canadian Tax Support: Full GST/HST and provincial PST support for all provinces

Key Features to Help Users With:
1. Receipt Scanning (📷 Snap Receipt) - fastest way to record expenses
2. New Transaction - manually enter income/expense
3. Recurring Transactions - set up repeating payments
4. Reports - view financial data and tax info
5. Reconciliation - match bank records

When helping users:
- Be friendly and supportive
- Give step-by-step instructions when needed
- Suggest using Receipt Scanning for quick expense entry
- Mention how to access features from the navigation menu
- Explain tax handling for different Canadian provinces
- Keep responses concise but thorough

Always respond in a helpful, encouraging tone.`

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, conversationHistory } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const messages = [
      ...(conversationHistory || []),
      { role: 'user' as const, content: message },
    ]

    const anthropic = await getClient()
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 })
    }

    return NextResponse.json({
      reply: content.text,
      success: true,
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
