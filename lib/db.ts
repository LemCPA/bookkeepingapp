import path from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

interface DbData {
  users: { id: number; email: string; password_hash: string; name: string; email_verified?: boolean; gst_registered?: boolean; gst_number?: string; qbo_access_token?: string; qbo_refresh_token?: string; qbo_realm_id?: string; qbo_connected_at?: string; plan?: string; helcim_customer_id?: string | null; created_at: string }[]
  clients: { id: number; user_id: number; name: string; email?: string; address?: string; gst_registered: boolean; gst_number?: string; created_at: string }[]
  chart_of_accounts: { id: number; code: string; name: string; type: string; user_id?: number }[]
  transactions: { id: number; user_id: number; client_id?: number; account_id?: number; transaction_date: string; due_date?: string; amount: number; gst_hst_rate?: number; gst_hst_amount?: number; description: string; type: string; reference_number?: string; created_at: string; updated_at?: string; reconciliation_id?: number; reconciliation_status?: string; internal_notes?: { id: number; content: string; createdAt: string; updatedAt?: string; createdBy?: string }[]; tags?: string[]; audit_trail?: { field: string; oldValue: any; newValue: any; changedAt: string; changedBy?: string }[]; project_id?: number }[]
  documents: { id: number; transaction_id: number; file_name: string; file_path: string; file_size: number; uploaded_at: string }[]
  bank_reconciliations: { id: number; user_id: number; account_id: number; statement_date: string; statement_opening_balance: number; statement_closing_balance: number; reconciliation_date: string; status: string; created_at: string; updated_at: string }[]
  reconciliation_items: { id: number; reconciliation_id: number; transaction_id: number; status: string; created_at: string }[]
  recurring_transactions: { id: number; user_id: number; account_id: number; template_name: string; amount: number; description: string; frequency: string; start_date: string; end_date?: string; next_due_date: string; is_active: boolean; gst_hst_rate?: number; gst_hst_amount?: number; created_at: string; updated_at?: string }[]
  transaction_instances: { id: number; recurring_template_id: number; created_transaction_id: number; due_date: string; status: string; created_at: string }[]
  subscriptions: { id: number; user_id: number; plan: string; status: string; helcim_customer_id: string; helcim_subscription_id: string; trial_end_date?: string | null; current_period_start: string; current_period_end: string; created_at: string; canceled_at?: string | null; updated_at: string }[]
  billing_history: { id: number; user_id: number; helcim_invoice_id: string; amount: number; currency: string; status: string; period_start: string; period_end: string; paid_at?: string; created_at: string }[]
  payment_methods: { id: number; user_id: number; helcim_payment_method_id: string; last4: string; brand: string; exp_month: number; exp_year: number; is_default: boolean; created_at: string }[]
  helcim_webhooks: { id: number; helcim_event_id: string; event_type: string; processed: boolean; created_at: string }[]
  nextUserId: number
  nextClientId: number
  nextAccountId: number
  nextTransactionId: number
  nextDocumentId: number
  nextBankReconciliationId: number
  nextReconciliationItemId: number
  nextRecurringTransactionId: number
  nextTransactionInstanceId: number
  nextSubscriptionId: number
  nextBillingHistoryId: number
  nextPaymentMethodId: number
  nextHelcimWebhookId: number
}

const dbPath = path.join(process.cwd(), '.data', 'bookkeeping.json')

export function getDb(): DbData {
  try {
    console.log('getDb called, dbPath:', dbPath)
    console.log('File exists:', existsSync(dbPath))
    if (existsSync(dbPath)) {
      const content = readFileSync(dbPath, 'utf-8')
      const db = JSON.parse(content)
      console.log('Loaded database with', db.transactions.length, 'transactions')

      // Handle missing fields for backward compatibility
      if (!db.users) {
        console.log('Adding missing users table with demo user')
        db.users = [
          {
            id: 1,
            email: 'demo@bookkeeping.ca',
            password_hash: 'demo123',
            name: 'Demo User',
            gst_registered: true,
            gst_number: '123456789RT0001',
            created_at: new Date().toISOString(),
          },
        ]
        db.nextUserId = 2
      }
      if (!db.bank_reconciliations) {
        db.bank_reconciliations = []
      }
      if (!db.reconciliation_items) {
        db.reconciliation_items = []
      }
      if (!db.recurring_transactions) {
        db.recurring_transactions = []
      }
      if (!db.transaction_instances) {
        db.transaction_instances = []
      }
      if (!db.nextBankReconciliationId) {
        db.nextBankReconciliationId = 1
      }
      if (!db.nextReconciliationItemId) {
        db.nextReconciliationItemId = 1
      }
      if (!db.nextRecurringTransactionId) {
        db.nextRecurringTransactionId = 1
      }
      if (!db.nextTransactionInstanceId) {
        db.nextTransactionInstanceId = 1
      }
      if (!db.nextUserId) {
        db.nextUserId = 2
      }
      if (!db.subscriptions) {
        db.subscriptions = []
      }
      if (!db.billing_history) {
        db.billing_history = []
      }
      if (!db.payment_methods) {
        db.payment_methods = []
      }
      if (!db.helcim_webhooks) {
        db.helcim_webhooks = []
      }
      if (!db.nextSubscriptionId) {
        db.nextSubscriptionId = 1
      }
      if (!db.nextBillingHistoryId) {
        db.nextBillingHistoryId = 1
      }
      if (!db.nextPaymentMethodId) {
        db.nextPaymentMethodId = 1
      }
      if (!db.nextHelcimWebhookId) {
        db.nextHelcimWebhookId = 1
      }
      if (!db.clients) {
        db.clients = []
      }
      if (!db.nextClientId) {
        db.nextClientId = 1
      }

      // Save the updated database with new fields
      saveDb(db)
      return db
    }
  } catch (e) {
    console.error('Error reading database:', e)
  }

  console.log('Initializing new database')
  return initializeDb()
}

function initializeDb(): DbData {
  const db: DbData = {
    users: [
      {
        id: 1,
        email: 'demo@bookkeeping.ca',
        password_hash: 'demo123', // In production, hash with bcrypt
        name: 'Demo User',
        gst_registered: true,
        gst_number: '123456789RT0001',
        created_at: new Date().toISOString(),
      },
    ],
    clients: [
      { id: 1, user_id: 1, name: 'Acme Corporation', gst_registered: true, gst_number: '123456789RT0002', created_at: new Date().toISOString() },
      { id: 2, user_id: 1, name: 'Tech Startup Inc', gst_registered: false, created_at: new Date().toISOString() },
    ],
    chart_of_accounts: [
      // ASSETS (for demo user - user_id: 1)
      { id: 1, code: '1000', name: 'Cash', type: 'ASSET', user_id: 1 },
      { id: 2, code: '1010', name: 'Checking Account', type: 'ASSET', user_id: 1 },
      { id: 3, code: '1020', name: 'Savings Account', type: 'ASSET', user_id: 1 },
      { id: 4, code: '1030', name: 'Accounts Receivable', type: 'ASSET', user_id: 1 },
      // LIABILITIES
      { id: 5, code: '2000', name: 'Accounts Payable', type: 'LIABILITY', user_id: 1 },
      { id: 6, code: '2010', name: 'Credit Card', type: 'LIABILITY', user_id: 1 },
      // EQUITY
      { id: 7, code: '3000', name: 'Retained Earnings', type: 'EQUITY', user_id: 1 },
      // INCOME
      { id: 8, code: '4000', name: 'Service Revenue', type: 'INCOME', user_id: 1 },
      { id: 9, code: '4010', name: 'Product Revenue', type: 'INCOME', user_id: 1 },
      // EXPENSES
      { id: 10, code: '5100', name: 'Advertising', type: 'EXPENSE', user_id: 1 },
      { id: 11, code: '5110', name: 'Meals and Entertainment (50% rule)', type: 'EXPENSE', user_id: 1 },
      { id: 12, code: '5120', name: 'Insurance', type: 'EXPENSE', user_id: 1 },
      { id: 13, code: '5130', name: 'Interest and Bank Charges', type: 'EXPENSE', user_id: 1 },
      { id: 14, code: '5140', name: 'Business Taxes and Licenses', type: 'EXPENSE', user_id: 1 },
      { id: 15, code: '5150', name: 'Office Expenses', type: 'EXPENSE', user_id: 1 },
      { id: 16, code: '5160', name: 'Supplies', type: 'EXPENSE', user_id: 1 },
      { id: 17, code: '5170', name: 'Legal and Accounting Fees', type: 'EXPENSE', user_id: 1 },
      { id: 18, code: '5180', name: 'Rent', type: 'EXPENSE', user_id: 1 },
      { id: 19, code: '5190', name: 'Salaries and Wages', type: 'EXPENSE', user_id: 1 },
      { id: 20, code: '5200', name: 'Travel', type: 'EXPENSE', user_id: 1 },
      { id: 21, code: '5210', name: 'Telephone and Utilities', type: 'EXPENSE', user_id: 1 },
      { id: 22, code: '5220', name: 'Motor Vehicle Expenses', type: 'EXPENSE', user_id: 1 },
      { id: 23, code: '5230', name: 'Capital Cost Allowance (CCA)', type: 'EXPENSE', user_id: 1 },
    ],
    transactions: [],
    documents: [],
    bank_reconciliations: [],
    reconciliation_items: [],
    recurring_transactions: [],
    transaction_instances: [],
    subscriptions: [],
    billing_history: [],
    payment_methods: [],
    helcim_webhooks: [],
    nextUserId: 2,
    nextClientId: 3,
    nextAccountId: 24,
    nextTransactionId: 1,
    nextDocumentId: 1,
    nextBankReconciliationId: 1,
    nextReconciliationItemId: 1,
    nextRecurringTransactionId: 1,
    nextTransactionInstanceId: 1,
    nextSubscriptionId: 1,
    nextBillingHistoryId: 1,
    nextPaymentMethodId: 1,
    nextHelcimWebhookId: 1,
  }
  saveDb(db)
  return db
}

export function saveDb(db: DbData) {
  const dir = path.dirname(dbPath)
  try {
    if (!existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true })
    }
    writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
  } catch (e) {
    console.error('Error saving database:', e)
  }
}

// User queries
export function getUserByEmail(email: string) {
  return getDb().users.find(u => u.email === email)
}

export function getUser(id: number) {
  return getDb().users.find(u => u.id === id)
}

export function createUser(email: string, password_hash: string, name: string, gstRegistered: boolean = false, gstNumber?: string) {
  const db = getDb()
  const id = db.nextUserId++

  // Create default chart of accounts for this user
  const defaultAccounts = [
    { code: '1000', name: 'Cash', type: 'ASSET' },
    { code: '1010', name: 'Checking Account', type: 'ASSET' },
    { code: '1020', name: 'Savings Account', type: 'ASSET' },
    { code: '1030', name: 'Accounts Receivable', type: 'ASSET' },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: '2010', name: 'Credit Card', type: 'LIABILITY' },
    { code: '3000', name: 'Retained Earnings', type: 'EQUITY' },
    { code: '4000', name: 'Service Revenue', type: 'INCOME' },
    { code: '4010', name: 'Product Revenue', type: 'INCOME' },
    { code: '5100', name: 'Advertising', type: 'EXPENSE' },
    { code: '5110', name: 'Meals and Entertainment (50% rule)', type: 'EXPENSE' },
    { code: '5120', name: 'Insurance', type: 'EXPENSE' },
    { code: '5130', name: 'Interest and Bank Charges', type: 'EXPENSE' },
    { code: '5140', name: 'Business Taxes and Licenses', type: 'EXPENSE' },
    { code: '5150', name: 'Office Expenses', type: 'EXPENSE' },
    { code: '5160', name: 'Supplies', type: 'EXPENSE' },
    { code: '5170', name: 'Legal and Accounting Fees', type: 'EXPENSE' },
    { code: '5180', name: 'Rent', type: 'EXPENSE' },
    { code: '5190', name: 'Salaries and Wages', type: 'EXPENSE' },
    { code: '5200', name: 'Travel', type: 'EXPENSE' },
    { code: '5210', name: 'Telephone and Utilities', type: 'EXPENSE' },
    { code: '5220', name: 'Motor Vehicle Expenses', type: 'EXPENSE' },
    { code: '5230', name: 'Capital Cost Allowance (CCA)', type: 'EXPENSE' },
  ]

  // Add default accounts for this user
  let nextAccountId = db.nextAccountId
  defaultAccounts.forEach(acc => {
    db.chart_of_accounts.push({
      id: nextAccountId++,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      user_id: id,
    })
  })
  db.nextAccountId = nextAccountId

  db.users.push({
    id,
    email,
    password_hash,
    name,
    gst_registered: gstRegistered,
    gst_number: gstNumber,
    created_at: new Date().toISOString(),
  })
  saveDb(db)
  return { lastID: id }
}

export function updateUser(id: number, name?: string, gstRegistered?: boolean, gstNumber?: string) {
  const db = getDb()
  const user = db.users.find(u => u.id === id)
  if (user) {
    if (name !== undefined) user.name = name
    if (gstRegistered !== undefined) user.gst_registered = gstRegistered
    if (gstNumber !== undefined) user.gst_number = gstNumber
    saveDb(db)
  }
}

// Client queries
export function getClients(userId: number) {
  const db = getDb()
  return db.clients
    .filter(c => c.user_id === userId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getClient(id: number) {
  return getDb().clients.find(c => c.id === id)
}

export function createClient(userId: number, name: string, email?: string, address?: string, gstRegistered: boolean = false, gstNumber?: string) {
  const db = getDb()
  const id = db.nextClientId++
  db.clients.push({
    id,
    user_id: userId,
    name,
    email,
    address,
    gst_registered: gstRegistered,
    gst_number: gstNumber,
    created_at: new Date().toISOString(),
  })
  saveDb(db)
  return { lastID: id }
}

export function updateClient(id: number, name?: string, email?: string, address?: string, gstRegistered?: boolean, gstNumber?: string) {
  const db = getDb()
  const client = db.clients.find(c => c.id === id)
  if (client) {
    if (name !== undefined) client.name = name
    if (email !== undefined) client.email = email
    if (address !== undefined) client.address = address
    if (gstRegistered !== undefined) client.gst_registered = gstRegistered
    if (gstNumber !== undefined) client.gst_number = gstNumber
    saveDb(db)
  }
}

export function deleteClient(id: number) {
  const db = getDb()
  db.clients = db.clients.filter(c => c.id !== id)
  saveDb(db)
}

// Chart of Accounts queries
export function getChartOfAccounts(userId: number) {
  const db = getDb()
  return db.chart_of_accounts
    .filter(a => a.user_id === userId)
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function getAccount(id: number) {
  return getDb().chart_of_accounts.find(a => a.id === id)
}

export function createAccount(code: string, name: string, type: string, userId: number) {
  const db = getDb()
  const id = db.nextAccountId++
  db.chart_of_accounts.push({ id, code, name, type, user_id: userId })
  saveDb(db)
  return { lastID: id }
}

export function updateAccount(id: number, code: string, name: string, type: string, userId: number) {
  const db = getDb()
  const account = db.chart_of_accounts.find(a => a.id === id)
  if (account) {
    account.code = code
    account.name = name
    account.type = type
    account.user_id = userId
    saveDb(db)
  }
}

export function deleteAccount(id: number) {
  const db = getDb()
  db.chart_of_accounts = db.chart_of_accounts.filter(a => a.id !== id)
  saveDb(db)
}

// Transaction queries
export function getTransactions(
  userId: number,
  month?: string,
  dateFrom?: string,
  dateTo?: string,
  types?: string[],
  search?: string,
  sortBy: 'date' | 'amount' = 'date',
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const db = getDb()

  return db.transactions
    .filter(t => {
      // Filter by user
      if (t.user_id !== userId) return false

      // Original month filter
      if (month && !t.transaction_date.startsWith(month)) return false

      // Date range filters
      if (dateFrom && t.transaction_date < dateFrom) return false
      if (dateTo && t.transaction_date > dateTo) return false

      // Type filter
      if (types && types.length > 0 && !types.includes(t.type)) return false

      // Search filter (search in description)
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesSearch = t.description.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      return true
    })
    .map(t => {
      const account = db.chart_of_accounts.find(a => a.id === t.account_id)
      return {
        ...t,
        account_name: account?.name || '',
      }
    })
    .sort((a, b) => {
      let comparison = 0

      if (sortBy === 'amount') {
        comparison = a.amount - b.amount
      } else {
        // default to date sorting
        comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
}

export function getTransaction(id: number) {
  const db = getDb()
  const t = db.transactions.find(t => t.id === id)
  if (!t) return undefined
  const account = db.chart_of_accounts.find(a => a.id === t.account_id)
  return {
    ...t,
    account_name: account?.name || '',
  }
}

export function createTransaction(
  userId: number,
  accountId: number,
  transactionDate: string,
  amount: number,
  description: string,
  type: string,
  gstHstRate: number = 0,
  gstHstAmount: number = 0,
  referenceNumber?: string
) {
  const db = getDb()
  const id = db.nextTransactionId++
  db.transactions.push({
    id,
    user_id: userId,
    account_id: accountId,
    transaction_date: transactionDate,
    amount,
    gst_hst_rate: gstHstRate,
    gst_hst_amount: gstHstAmount,
    description,
    type,
    reference_number: referenceNumber,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  saveDb(db)
  return { lastID: id }
}

export function updateTransaction(
  id: number,
  accountId?: number,
  transactionDate?: string,
  amount?: number,
  description?: string,
  gstHstRate?: number,
  gstHstAmount?: number,
  referenceNumber?: string
) {
  const db = getDb()
  const transaction = db.transactions.find(t => t.id === id)
  if (transaction) {
    if (accountId !== undefined) transaction.account_id = accountId
    if (transactionDate !== undefined) transaction.transaction_date = transactionDate
    if (amount !== undefined) transaction.amount = amount
    if (description !== undefined) transaction.description = description
    if (gstHstRate !== undefined) transaction.gst_hst_rate = gstHstRate
    if (gstHstAmount !== undefined) transaction.gst_hst_amount = gstHstAmount
    if (referenceNumber !== undefined) transaction.reference_number = referenceNumber
    transaction.updated_at = new Date().toISOString()
    saveDb(db)
    return true
  }
  return false
}

export function deleteTransaction(id: number) {
  const db = getDb()
  const initialLength = db.transactions.length
  db.transactions = db.transactions.filter(t => t.id !== id)
  if (db.transactions.length < initialLength) {
    saveDb(db)
    return true
  }
  return false
}

// Document queries
export function getDocumentsByTransaction(transactionId: number) {
  return getDb().documents
    .filter(d => d.transaction_id === transactionId)
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
}

export function createDocument(transactionId: number, fileName: string, filePath: string, fileSize: number) {
  const db = getDb()
  const id = db.nextDocumentId++
  db.documents.push({
    id,
    transaction_id: transactionId,
    file_name: fileName,
    file_path: filePath,
    file_size: fileSize,
    uploaded_at: new Date().toISOString(),
  })
  saveDb(db)
  return { lastID: id }
}

// Reporting queries
export function getBalanceSheetData(userId: number, month: string) {
  const db = getDb()
  const endDate = new Date(month + '-01')
  endDate.setMonth(endDate.getMonth() + 1)

  const accountBalances: { [key: string]: number } = {}

  // Initialize all accounts for this user
  db.chart_of_accounts
    .filter(a => a.user_id === userId && a.type && ['ASSET', 'LIABILITY', 'EQUITY'].includes(a.type))
    .forEach(a => {
      accountBalances[a.id] = 0
    })

  // Calculate balances
  db.transactions
    .filter(t => t.user_id === userId && t.transaction_date < month + '-32')
    .forEach(t => {
      const account = db.chart_of_accounts.find(a => a.id === t.account_id)
      if (account) {
        accountBalances[account.id] = (accountBalances[account.id] || 0) + t.amount
      }
    })

  // Return formatted data
  return db.chart_of_accounts
    .filter(a => a.user_id === userId && a.type && ['ASSET', 'LIABILITY', 'EQUITY'].includes(a.type))
    .map(a => ({
      type: a.type,
      name: a.name,
      code: a.code,
      balance: accountBalances[a.id] || 0,
    }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function getIncomeStatementData(userId: number, month: string) {
  const db = getDb()

  const accountBalances: { [key: string]: number } = {}

  // Initialize all accounts for this user
  db.chart_of_accounts
    .filter(a => a.user_id === userId && a.type && ['INCOME', 'EXPENSE'].includes(a.type))
    .forEach(a => {
      accountBalances[a.id] = 0
    })

  // Calculate balances for the month
  db.transactions
    .filter(t => t.user_id === userId && t.transaction_date.startsWith(month))
    .forEach(t => {
      const account = db.chart_of_accounts.find(a => a.id === t.account_id)
      if (account) {
        accountBalances[account.id] = (accountBalances[account.id] || 0) + t.amount
      }
    })

  // Return formatted data
  return db.chart_of_accounts
    .filter(a => a.user_id === userId && a.type && ['INCOME', 'EXPENSE'].includes(a.type))
    .map(a => ({
      type: a.type,
      name: a.name,
      code: a.code,
      balance: accountBalances[a.id] || 0,
    }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function getGstFilingData(userId: number, startMonth?: string, endMonth?: string) {
  const db = getDb()
  const user = db.users.find(u => u.id === userId)

  if (!user || !user.gst_registered) {
    return null
  }

  let relevantTransactions = db.transactions.filter(t => t.user_id === userId)

  // Filter by date range if provided
  if (startMonth || endMonth) {
    const start = startMonth ? new Date(startMonth + '-01') : new Date('1900-01-01')
    const end = endMonth ? new Date(endMonth + '-31') : new Date('2099-12-31')

    relevantTransactions = relevantTransactions.filter(t => {
      const txDate = new Date(t.transaction_date)
      return txDate >= start && txDate <= end
    })
  }

  let gstCollected = 0
  let gstPaid = 0

  relevantTransactions.forEach(t => {
    if (t.type === 'INVOICE' && (t.gst_hst_amount ?? 0) > 0) {
      gstCollected += t.gst_hst_amount ?? 0
    } else if ((t.type === 'RECEIPT' || t.type === 'ADJUSTMENT') && (t.gst_hst_amount ?? 0) > 0) {
      gstPaid += t.gst_hst_amount ?? 0
    }
  })

  const netGst = gstCollected - gstPaid

  // Format period display
  let periodDisplay = 'All'
  if (startMonth && endMonth) {
    periodDisplay = startMonth === endMonth ? startMonth : `${startMonth} to ${endMonth}`
  } else if (startMonth) {
    periodDisplay = `${startMonth} onwards`
  } else if (endMonth) {
    periodDisplay = `up to ${endMonth}`
  }

  return {
    userName: user.name,
    gstNumber: user.gst_number || '',
    month: periodDisplay,
    gstCollected,
    gstPaid,
    netGst,
    owingOrRefundable: netGst > 0 ? 'Owing' : 'Refundable',
    amount: Math.abs(netGst),
  }
}

export function getIncomeStatementDataByMonths(userId: number, startMonth: string, endMonth: string) {
  const db = getDb()

  // Generate list of months between start and end
  const months: string[] = []
  const [startYear, startM] = startMonth.split('-').map(Number)
  const [endYear, endM] = endMonth.split('-').map(Number)

  let year = startYear
  let month = startM
  while (year < endYear || (year === endYear && month <= endM)) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    months.push(monthStr)
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }

  // Get all income and expense accounts for this user
  const accounts = db.chart_of_accounts
    .filter(a => a.user_id === userId && a.type && ['INCOME', 'EXPENSE'].includes(a.type))
    .sort((a, b) => a.code.localeCompare(b.code))

  // Initialize data structure: account -> month -> balance
  const accountData: { [accountId: number]: { [month: string]: number } } = {}
  accounts.forEach(a => {
    accountData[a.id] = {}
    months.forEach(m => {
      accountData[a.id][m] = 0
    })
  })

  // Calculate balances
  db.transactions
    .filter(t => t.user_id === userId)
    .forEach(t => {
      const account = db.chart_of_accounts.find(a => a.id === t.account_id)
      const tMonth = t.transaction_date.substring(0, 7)
      if (account && months.includes(tMonth) && accountData[account.id]) {
        accountData[account.id][tMonth] = (accountData[account.id][tMonth] || 0) + t.amount
      }
    })

  // Calculate totals per month
  const monthlyTotals: { [month: string]: { income: number; expenses: number; netIncome: number } } = {}
  months.forEach(m => {
    let income = 0
    let expenses = 0
    accounts.forEach(a => {
      const balance = accountData[a.id][m] || 0
      if (a.type === 'INCOME') income += balance
      if (a.type === 'EXPENSE') expenses += balance
    })
    monthlyTotals[m] = {
      income,
      expenses,
      netIncome: income - expenses,
    }
  })

  // Calculate totals per account across all months
  const accountTotals: { [accountId: number]: number } = {}
  accounts.forEach(a => {
    accountTotals[a.id] = months.reduce((sum, m) => sum + (accountData[a.id][m] || 0), 0)
  })

  // Calculate grand totals
  let totalIncome = 0
  let totalExpenses = 0
  accounts.forEach(a => {
    const total = accountTotals[a.id] || 0
    if (a.type === 'INCOME') totalIncome += total
    if (a.type === 'EXPENSE') totalExpenses += total
  })

  return {
    months,
    accounts: accounts.map(a => ({
      id: a.id,
      type: a.type,
      name: a.name,
      code: a.code,
      monthlyBalances: accountData[a.id],
      total: accountTotals[a.id] || 0,
    })),
    monthlyTotals,
    grandTotals: {
      income: totalIncome,
      expenses: totalExpenses,
      netIncome: totalIncome - totalExpenses,
    },
  }
}

// Bank Reconciliation queries
export function createBankReconciliation(
  userId: number,
  accountId: number,
  statementDate: string,
  statementOpeningBalance: number,
  statementClosingBalance: number
) {
  const db = getDb()
  const id = db.nextBankReconciliationId++
  db.bank_reconciliations.push({
    id,
    user_id: userId,
    account_id: accountId,
    statement_date: statementDate,
    statement_opening_balance: statementOpeningBalance,
    statement_closing_balance: statementClosingBalance,
    reconciliation_date: new Date().toISOString(),
    status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  saveDb(db)
  return { lastID: id }
}

export function getBankReconciliations(userId: number, accountId?: number, limit: number = 10) {
  const db = getDb()
  return db.bank_reconciliations
    .filter(r => r.user_id === userId && (!accountId || r.account_id === accountId))
    .map(r => {
      const account = db.chart_of_accounts.find(a => a.id === r.account_id)
      return {
        ...r,
        account_name: account?.name || '',
      }
    })
    .sort((a, b) => new Date(b.reconciliation_date).getTime() - new Date(a.reconciliation_date).getTime())
    .slice(0, limit)
}

export function getBankReconciliation(id: number) {
  const db = getDb()
  const recon = db.bank_reconciliations.find(r => r.id === id)
  if (!recon) return undefined

  const account = db.chart_of_accounts.find(a => a.id === recon.account_id)
  const items = db.reconciliation_items.filter(i => i.reconciliation_id === id)

  // Calculate totals
  let matchedAmount = 0
  items.forEach(item => {
    if (item.status === 'MATCHED') {
      const txn = db.transactions.find(t => t.id === item.transaction_id)
      if (txn) {
        matchedAmount += txn.amount
      }
    }
  })

  const variance = recon.statement_closing_balance - matchedAmount
  const unmatched = items.filter(i => i.status === 'UNMATCHED')

  return {
    ...recon,
    account_name: account?.name || '',
    matched_amount: matchedAmount,
    variance,
    matched_count: items.filter(i => i.status === 'MATCHED').length,
    unmatched_count: unmatched.length,
  }
}

export function updateBankReconciliation(id: number, status: string) {
  const db = getDb()
  const recon = db.bank_reconciliations.find(r => r.id === id)
  if (recon) {
    recon.status = status
    recon.updated_at = new Date().toISOString()

    // If completing reconciliation, mark matched transactions as CLEARED
    if (status === 'COMPLETED') {
      const items = db.reconciliation_items.filter(i => i.reconciliation_id === id && i.status === 'MATCHED')
      items.forEach(item => {
        const txn = db.transactions.find(t => t.id === item.transaction_id)
        if (txn) {
          txn.reconciliation_id = id
          txn.reconciliation_status = 'CLEARED'
          txn.updated_at = new Date().toISOString()
        }
      })
    }

    saveDb(db)
    return true
  }
  return false
}

export function createReconciliationItem(reconciliationId: number, transactionId: number, status: string) {
  const db = getDb()
  const id = db.nextReconciliationItemId++
  db.reconciliation_items.push({
    id,
    reconciliation_id: reconciliationId,
    transaction_id: transactionId,
    status,
    created_at: new Date().toISOString(),
  })
  saveDb(db)
  return { lastID: id }
}

export function getReconciliationItems(reconciliationId: number) {
  const db = getDb()
  return db.reconciliation_items
    .filter(i => i.reconciliation_id === reconciliationId)
    .map(i => {
      const txn = db.transactions.find(t => t.id === i.transaction_id)
      return {
        ...i,
        transaction: txn,
      }
    })
}

export function updateReconciliationItemStatus(itemId: number, status: string) {
  const db = getDb()
  const item = db.reconciliation_items.find(i => i.id === itemId)
  if (item) {
    item.status = status
    saveDb(db)
    return true
  }
  return false
}

export function calculateReconciliationBalance(reconciliationId: number) {
  const db = getDb()
  const recon = db.bank_reconciliations.find(r => r.id === reconciliationId)
  if (!recon) return null

  const items = db.reconciliation_items.filter(i => i.reconciliation_id === reconciliationId)

  let matchedAmount = 0
  let clearedCount = 0

  items.forEach(item => {
    if (item.status === 'MATCHED') {
      const txn = db.transactions.find(t => t.id === item.transaction_id)
      if (txn) {
        matchedAmount += txn.amount
        clearedCount++
      }
    }
  })

  return {
    matched_amount: matchedAmount,
    unmatched_amount: recon.statement_closing_balance - matchedAmount,
    variance: recon.statement_closing_balance - matchedAmount,
    cleared_count: clearedCount,
    unmatched_count: items.filter(i => i.status === 'UNMATCHED').length,
  }
}

export function getEligibleTransactionsForReconciliation(
  userId: number,
  accountId: number,
  statementDateStart: string,
  statementDateEnd: string
) {
  const db = getDb()
  console.log(`[getEligibleTransactions] Called with userId=${userId}, accountId=${accountId}, dateStart=${statementDateStart}, dateEnd=${statementDateEnd}`)
  console.log(`[getEligibleTransactions] Total transactions in DB: ${db.transactions.length}`)

  // Get all already-matched transactions in this and past reconciliations
  const matchedIds = new Set<number>()
  db.reconciliation_items
    .filter(i => i.status === 'MATCHED')
    .forEach(i => {
      matchedIds.add(i.transaction_id)
    })
  console.log(`[getEligibleTransactions] Matched IDs: ${Array.from(matchedIds).join(', ')}`)

  // Return transactions from this account, within date range, not already matched
  const result = db.transactions
    .filter(t => {
      const matches =
        t.user_id === userId &&
        t.account_id === accountId &&
        t.transaction_date >= statementDateStart &&
        t.transaction_date <= statementDateEnd &&
        !matchedIds.has(t.id)
      if (!matches) {
        console.log(`[filter] Transaction ${t.id} filtered out: userId=${t.user_id}===${userId}, accountId=${t.account_id}===${accountId}, dateRange=${t.transaction_date}>=${statementDateStart}&&<=${statementDateEnd}, notMatched=${!matchedIds.has(t.id)}`)
      }
      return matches
    })
    .map(t => ({
      ...t,
      account_name: db.chart_of_accounts.find(a => a.id === t.account_id)?.name || '',
    }))
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

  console.log(`[getEligibleTransactions] Returning ${result.length} eligible transactions`)
  return result
}

// Aging Report queries
export function getARAgingData(userId: number, asOfDate: string) {
  const db = getDb()
  const asOfDateObj = new Date(asOfDate)

  // Define aging buckets
  const agingBuckets = [
    { range: 'Current', minDays: -Infinity, maxDays: 0 },
    { range: '1-30 Days', minDays: 1, maxDays: 30 },
    { range: '31-60 Days', minDays: 31, maxDays: 60 },
    { range: '61-90 Days', minDays: 61, maxDays: 90 },
    { range: '90+ Days', minDays: 91, maxDays: Infinity },
  ]

  // Filter for INVOICE type transactions (unpaid only) - invoices sent to customers
  const invoices = db.transactions.filter(t =>
    t.user_id === userId &&
    t.type === 'INVOICE' &&
    (!t.reconciliation_status || t.reconciliation_status !== 'CLEARED')
  )

  // All invoices are grouped together (not by customer, since it's single user)
  // Build result row with aging bucket data
  const bucketData = agingBuckets.map(bucket => {
    const bucketsInRange = invoices.filter(inv => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.transaction_date)
      dueDate.setDate(dueDate.getDate() + 30) // Default 30-day terms if no due_date
      const daysOverdue = Math.floor((asOfDateObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysOverdue >= bucket.minDays && daysOverdue <= bucket.maxDays
    })

    return {
      range: bucket.range,
      totalAmount: bucketsInRange.reduce((sum, inv) => sum + inv.amount, 0),
      transactionCount: bucketsInRange.length,
    }
  })

  const totalUnpaid = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const lastInvoiceDate = invoices.length > 0
    ? invoices.reduce((latest, inv) => (inv.transaction_date > latest ? inv.transaction_date : latest), '')
    : ''

  const result = [{
    customerId: userId,
    customerName: 'Income Receivable',
    totalUnpaid,
    buckets: bucketData,
    lastTransactionDate: lastInvoiceDate,
  }]

  return result
}

// Legacy function for compatibility - now just shows all A/R data
function _getARAgingDataByCustomer(userId: number, asOfDate: string) {
  const db = getDb()
  const asOfDateObj = new Date(asOfDate)

  // Define aging buckets
  const agingBuckets = [
    { range: 'Current', minDays: -Infinity, maxDays: 0 },
    { range: '1-30 Days', minDays: 1, maxDays: 30 },
    { range: '31-60 Days', minDays: 31, maxDays: 60 },
    { range: '61-90 Days', minDays: 61, maxDays: 90 },
    { range: '90+ Days', minDays: 91, maxDays: Infinity },
  ]

  // Filter for INVOICE type transactions (unpaid only)
  const invoices = db.transactions.filter(t =>
    t.user_id === userId &&
    t.type === 'INVOICE' &&
    (!t.reconciliation_status || t.reconciliation_status !== 'CLEARED')
  )

  // Calculate bucket data
  const bucketData = agingBuckets.map(bucket => {
    const bucketsInRange = invoices.filter(inv => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.transaction_date)
      dueDate.setDate(dueDate.getDate() + 30) // Default 30-day terms if no due_date
      const daysOverdue = Math.floor((asOfDateObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysOverdue >= bucket.minDays && daysOverdue <= bucket.maxDays
    })

    return {
      range: bucket.range,
      totalAmount: bucketsInRange.reduce((sum, inv) => sum + inv.amount, 0),
      transactionCount: bucketsInRange.length,
    }
  })

  const totalUnpaid = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const lastInvoiceDate = invoices.length > 0
    ? invoices.reduce((latest, inv) => (inv.transaction_date > latest ? inv.transaction_date : latest), '')
    : ''

  const result = {
    customerId: 0,
    customerName: 'All Invoices',
    totalUnpaid,
    buckets: bucketData,
    lastTransactionDate: lastInvoiceDate,
  }

  return [result]
}

export function getARAgingDetailData(userId: number, asOfDate: string) {
  const db = getDb()
  const asOfDateObj = new Date(asOfDate)

  // Get all INVOICE transactions for this user that are unpaid
  const transactions = db.transactions
    .filter(t =>
      t.user_id === userId &&
      t.type === 'INVOICE' &&
      (!t.reconciliation_status || t.reconciliation_status !== 'CLEARED')
    )
    .map(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : new Date(t.transaction_date)
      if (!t.due_date) {
        dueDate.setDate(dueDate.getDate() + 30) // Default 30-day terms
      }
      const daysOverdue = Math.floor((asOfDateObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      return {
        id: t.id,
        transaction_date: t.transaction_date,
        amount: t.amount,
        description: t.description,
        due_date: t.due_date || new Date(t.transaction_date).toISOString().split('T')[0],
        daysOverdue: Math.max(0, daysOverdue),
        status: t.reconciliation_status || 'OUTSTANDING',
      }
    })
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

  return {
    transactions,
    transactionCount: transactions.length,
    totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
  }
}

export function getAPAgingDetailData(userId: number, vendorName: string, asOfDate: string) {
  const db = getDb()
  const asOfDateObj = new Date(asOfDate)

  // Get liability accounts for this user
  const liabilityAccountIds = db.chart_of_accounts
    .filter(a => a.type === 'LIABILITY' && a.user_id === userId)
    .map(a => a.id)

  // Get all RECEIPT transactions for this user to liability accounts that match vendor name
  const allBills = db.transactions
    .filter(t =>
      t.user_id === userId &&
      t.type === 'RECEIPT' &&
      t.account_id &&
      liabilityAccountIds.includes(t.account_id) &&
      (!t.reconciliation_status || t.reconciliation_status !== 'CLEARED')
    )

  // Filter for vendor name (partial match from description)
  const transactions = allBills
    .filter(t => {
      const vendorFromDesc = t.description
        ? t.description.split(',')[0].split(' ').slice(0, 3).join(' ').toLowerCase()
        : ''
      return vendorFromDesc === vendorName.toLowerCase()
    })
    .map(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : new Date(t.transaction_date)
      if (!t.due_date) {
        dueDate.setDate(dueDate.getDate() + 30) // Default 30-day terms
      }
      const daysOverdue = Math.floor((asOfDateObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      return {
        id: t.id,
        transaction_date: t.transaction_date,
        amount: t.amount,
        description: t.description,
        due_date: t.due_date || new Date(t.transaction_date).toISOString().split('T')[0],
        daysOverdue: Math.max(0, daysOverdue),
        status: t.reconciliation_status || 'OUTSTANDING',
      }
    })
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

  return {
    vendorName,
    transactions,
    transactionCount: transactions.length,
    totalAmount: transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
  }
}

export function getAPAgingData(userId: number, asOfDate: string) {
  const db = getDb()
  const asOfDateObj = new Date(asOfDate)

  // Define aging buckets
  const agingBuckets = [
    { range: 'Current', minDays: -Infinity, maxDays: 0 },
    { range: '1-30 Days', minDays: 1, maxDays: 30 },
    { range: '31-60 Days', minDays: 31, maxDays: 60 },
    { range: '61-90 Days', minDays: 61, maxDays: 90 },
    { range: '90+ Days', minDays: 91, maxDays: Infinity },
  ]

  // Get liability accounts (payable accounts) for this user
  const liabilityAccountIds = db.chart_of_accounts
    .filter(a => a.type === 'LIABILITY' && a.user_id === userId)
    .map(a => a.id)

  // Filter for RECEIPT type transactions to liability accounts (unpaid only)
  const bills = db.transactions.filter(t =>
    t.user_id === userId &&
    t.type === 'RECEIPT' &&
    t.account_id &&
    liabilityAccountIds.includes(t.account_id) &&
    (!t.reconciliation_status || t.reconciliation_status !== 'CLEARED')
  )

  // Group by vendor (extract from description or use account name as fallback)
  const vendorMap: { [vendor: string]: { invoices: any[] } } = {}

  bills.forEach(txn => {
    // Extract vendor name from description (take first 3 words or up to comma)
    let vendorName = txn.description || 'Unknown Vendor'
    if (vendorName.includes(',')) {
      vendorName = vendorName.split(',')[0]
    }
    const words = vendorName.split(' ')
    vendorName = words.slice(0, Math.min(3, words.length)).join(' ').trim()

    if (!vendorMap[vendorName]) {
      vendorMap[vendorName] = { invoices: [] }
    }
    vendorMap[vendorName].invoices.push(txn)
  })

  // Build result rows with aging bucket data
  const result = Object.entries(vendorMap).map(([vendorName, vendor]) => {
    const bucketData = agingBuckets.map(bucket => {
      const bucketsInRange = vendor.invoices.filter(bill => {
        const dueDate = bill.due_date ? new Date(bill.due_date) : new Date(bill.transaction_date)
        dueDate.setDate(dueDate.getDate() + 30) // Default 30-day terms if no due_date
        const daysOverdue = Math.floor((asOfDateObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysOverdue >= bucket.minDays && daysOverdue <= bucket.maxDays
      })

      return {
        range: bucket.range,
        totalAmount: bucketsInRange.reduce((sum, bill) => sum + Math.abs(bill.amount), 0),
        transactionCount: bucketsInRange.length,
      }
    })

    const totalUnpaid = vendor.invoices.reduce((sum, bill) => sum + Math.abs(bill.amount), 0)
    const lastBillDate = vendor.invoices.length > 0
      ? vendor.invoices.reduce((latest, bill) => (bill.transaction_date > latest ? bill.transaction_date : latest), '')
      : ''

    return {
      vendorName,
      totalUnpaid,
      buckets: bucketData,
      lastTransactionDate: lastBillDate,
    }
  })

  return result.sort((a, b) => a.vendorName.localeCompare(b.vendorName))
}

// Recurring Transactions queries
export function createRecurringTransaction(
  userId: number,
  accountId: number,
  templateName: string,
  amount: number,
  description: string,
  frequency: string,
  startDate: string,
  endDate?: string,
  gstHstRate: number = 0,
  gstHstAmount: number = 0
) {
  const db = getDb()
  const id = db.nextRecurringTransactionId++
  const today = new Date('2026-05-18')
  let nextDueDate = startDate

  if (frequency === 'MONTHLY') {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + 1)
    nextDueDate = date.toISOString().split('T')[0]
  } else if (frequency === 'QUARTERLY') {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + 3)
    nextDueDate = date.toISOString().split('T')[0]
  } else if (frequency === 'ANNUAL') {
    const date = new Date(startDate)
    date.setFullYear(date.getFullYear() + 1)
    nextDueDate = date.toISOString().split('T')[0]
  }

  db.recurring_transactions.push({
    id,
    user_id: userId,
    account_id: accountId,
    template_name: templateName,
    amount,
    description,
    frequency,
    start_date: startDate,
    end_date: endDate,
    next_due_date: nextDueDate,
    is_active: true,
    gst_hst_rate: gstHstRate,
    gst_hst_amount: gstHstAmount,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  saveDb(db)
  return { lastID: id }
}

export function getRecurringTransactions(userId?: number) {
  const db = getDb()
  let result = db.recurring_transactions
  if (userId) {
    result = result.filter(rt => rt.user_id === userId)
  }
  return result.map(rt => {
    const account = db.chart_of_accounts.find(a => a.id === rt.account_id)
    return {
      ...rt,
      account_name: account?.name || '',
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function getRecurringTransaction(id: number) {
  const db = getDb()
  const rt = db.recurring_transactions.find(r => r.id === id)
  if (!rt) return undefined
  const account = db.chart_of_accounts.find(a => a.id === rt.account_id)
  return {
    ...rt,
    account_name: account?.name || '',
  }
}

export function updateRecurringTransaction(
  id: number,
  userId?: number,
  accountId?: number,
  templateName?: string,
  amount?: number,
  description?: string,
  frequency?: string,
  endDate?: string,
  isActive?: boolean,
  gstHstRate?: number,
  gstHstAmount?: number
) {
  const db = getDb()
  const rt = db.recurring_transactions.find(r => r.id === id)
  if (rt) {
    if (userId !== undefined) rt.user_id = userId
    if (accountId !== undefined) rt.account_id = accountId
    if (templateName !== undefined) rt.template_name = templateName
    if (amount !== undefined) rt.amount = amount
    if (description !== undefined) rt.description = description
    if (frequency !== undefined) rt.frequency = frequency
    if (endDate !== undefined) rt.end_date = endDate
    if (isActive !== undefined) rt.is_active = isActive
    if (gstHstRate !== undefined) rt.gst_hst_rate = gstHstRate
    if (gstHstAmount !== undefined) rt.gst_hst_amount = gstHstAmount
    rt.updated_at = new Date().toISOString()
    saveDb(db)
    return true
  }
  return false
}

export function deleteRecurringTransaction(id: number) {
  const db = getDb()
  const initialLength = db.recurring_transactions.length
  db.recurring_transactions = db.recurring_transactions.filter(r => r.id !== id)
  if (db.recurring_transactions.length < initialLength) {
    saveDb(db)
    return true
  }
  return false
}

// Transaction Details Management (Notes, Tags, Audit Trail)
export function addTransactionNote(transactionId: number, content: string, createdBy?: string) {
  const db = getDb()
  const txn = db.transactions.find(t => t.id === transactionId)
  if (!txn) return null

  if (!txn.internal_notes) {
    txn.internal_notes = []
  }

  const noteId = txn.internal_notes.length > 0
    ? Math.max(...txn.internal_notes.map(n => n.id)) + 1
    : 1

  const note = {
    id: noteId,
    content,
    createdAt: new Date().toISOString(),
    createdBy: createdBy || 'System'
  }

  txn.internal_notes.push(note)
  txn.updated_at = new Date().toISOString()
  saveDb(db)
  return note
}

export function updateTransactionNote(transactionId: number, noteId: number, content: string) {
  const db = getDb()
  const txn = db.transactions.find(t => t.id === transactionId)
  if (!txn || !txn.internal_notes) return null

  const note = txn.internal_notes.find(n => n.id === noteId)
  if (!note) return null

  note.content = content
  note.updatedAt = new Date().toISOString()
  txn.updated_at = new Date().toISOString()
  saveDb(db)
  return note
}

export function deleteTransactionNote(transactionId: number, noteId: number) {
  const db = getDb()
  const txn = db.transactions.find(t => t.id === transactionId)
  if (!txn || !txn.internal_notes) return false

  const initialLength = txn.internal_notes.length
  txn.internal_notes = txn.internal_notes.filter(n => n.id !== noteId)

  if (txn.internal_notes.length < initialLength) {
    txn.updated_at = new Date().toISOString()
    saveDb(db)
    return true
  }
  return false
}

export function addTransactionTag(transactionId: number, tag: string) {
  const db = getDb()
  const txn = db.transactions.find(t => t.id === transactionId)
  if (!txn) return null

  if (!txn.tags) {
    txn.tags = []
  }

  // Avoid duplicate tags
  if (!txn.tags.includes(tag)) {
    txn.tags.push(tag)
    txn.updated_at = new Date().toISOString()
    saveDb(db)
  }

  return txn.tags
}

export function removeTransactionTag(transactionId: number, tag: string) {
  const db = getDb()
  const txn = db.transactions.find(t => t.id === transactionId)
  if (!txn || !txn.tags) return null

  const initialLength = txn.tags.length
  txn.tags = txn.tags.filter(t => t !== tag)

  if (txn.tags.length < initialLength) {
    txn.updated_at = new Date().toISOString()
    saveDb(db)
  }

  return txn.tags
}

export function getTransactionsByTag(userId: number, tag: string) {
  const db = getDb()
  return db.transactions.filter(
    t => t.user_id === userId && t.tags && t.tags.includes(tag)
  )
}

export function recordAuditTrail(transactionId: number, field: string, oldValue: any, newValue: any, changedBy?: string) {
  const db = getDb()
  const txn = db.transactions.find(t => t.id === transactionId)
  if (!txn) return null

  if (!txn.audit_trail) {
    txn.audit_trail = []
  }

  const entry = {
    field,
    oldValue,
    newValue,
    changedAt: new Date().toISOString(),
    changedBy: changedBy || 'System'
  }

  txn.audit_trail.push(entry)
  saveDb(db)
  return entry
}

// Trend and Comparison Functions
export interface MonthlyTrend {
  month: string
  revenue: number
  expenses: number
  netIncome: number
}

export interface TrendComparison {
  month1: string
  month2: string
  revenueChange: number
  revenueChangePercent: number
  expensesChange: number
  expensesChangePercent: number
  netIncomeChange: number
  netIncomeChangePercent: number
}

export function getTrendData(userId: number, startMonth: string, endMonth: string): MonthlyTrend[] {
  const db = getDb()
  const trends: MonthlyTrend[] = []

  const startDate = new Date(startMonth + '-01')
  const endDate = new Date(endMonth + '-01')
  let currentMonth = new Date(startDate)

  while (currentMonth <= endDate) {
    const monthStr = currentMonth.toISOString().split('T')[0].substring(0, 7)

    // Get income statement for this month
    const incomeData = getIncomeStatementData(userId, monthStr)

    let revenue = 0
    let expenses = 0

    incomeData.forEach(account => {
      if (account.type === 'INCOME') {
        revenue += account.balance
      } else if (account.type === 'EXPENSE') {
        expenses += Math.abs(account.balance)
      }
    })

    trends.push({
      month: monthStr,
      revenue,
      expenses,
      netIncome: revenue - expenses,
    })

    currentMonth.setMonth(currentMonth.getMonth() + 1)
  }

  return trends
}

export function getComparisonData(userId: number, period1: string, period2: string): TrendComparison {
  const db = getDb()

  // Get income statements for both periods
  const data1 = getIncomeStatementData(userId, period1)
  const data2 = getIncomeStatementData(userId, period2)

  let revenue1 = 0
  let expenses1 = 0
  let revenue2 = 0
  let expenses2 = 0

  data1.forEach(account => {
    if (account.type === 'INCOME') {
      revenue1 += account.balance
    } else if (account.type === 'EXPENSE') {
      expenses1 += Math.abs(account.balance)
    }
  })

  data2.forEach(account => {
    if (account.type === 'INCOME') {
      revenue2 += account.balance
    } else if (account.type === 'EXPENSE') {
      expenses2 += Math.abs(account.balance)
    }
  })

  const netIncome1 = revenue1 - expenses1
  const netIncome2 = revenue2 - expenses2

  const revenueChange = revenue2 - revenue1
  const revenueChangePercent = revenue1 !== 0 ? (revenueChange / revenue1) * 100 : 0

  const expensesChange = expenses2 - expenses1
  const expensesChangePercent = expenses1 !== 0 ? (expensesChange / expenses1) * 100 : 0

  const netIncomeChange = netIncome2 - netIncome1
  const netIncomeChangePercent = netIncome1 !== 0 ? (netIncomeChange / netIncome1) * 100 : 0

  return {
    month1: period1,
    month2: period2,
    revenueChange,
    revenueChangePercent,
    expensesChange,
    expensesChangePercent,
    netIncomeChange,
    netIncomeChangePercent,
  }
}

export function getYearOverYearData(userId: number, year: number): TrendComparison[] {
  const comparisons: TrendComparison[] = []
  const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

  for (const month of monthNames) {
    const period1 = `${year - 1}-${month}`
    const period2 = `${year}-${month}`

    const comparison = getComparisonData(userId, period1, period2)
    comparisons.push(comparison)
  }

  return comparisons
}

// Subscription Queries (Helcim Billing)
export function createSubscription(
  userId: number,
  plan: string,
  helcimCustomerId: string,
  helcimSubscriptionId: string,
  trialEndDate?: string
) {
  const db = getDb()
  const id = db.nextSubscriptionId++
  const now = new Date().toISOString()
  const currentPeriodEnd = new Date()
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)

  db.subscriptions.push({
    id,
    user_id: userId,
    plan,
    status: trialEndDate ? 'trialing' : 'active',
    helcim_customer_id: helcimCustomerId,
    helcim_subscription_id: helcimSubscriptionId,
    trial_end_date: trialEndDate || null,
    current_period_start: now.split('T')[0],
    current_period_end: currentPeriodEnd.toISOString().split('T')[0],
    created_at: now,
    updated_at: now,
  })

  // Update user's subscription info
  const user = db.users.find(u => u.id === userId)
  if (user) {
    user.plan = plan
    user.helcim_customer_id = helcimCustomerId
  }

  saveDb(db)
  return { lastID: id }
}

export function getSubscription(userId: number) {
  const db = getDb()
  return db.subscriptions.find(s => s.user_id === userId)
}

export function updateSubscription(
  userId: number,
  updates: {
    plan?: string
    status?: string
    trial_end_date?: string | null
    current_period_start?: string
    current_period_end?: string
    canceled_at?: string | null
  }
) {
  const db = getDb()
  const subscription = db.subscriptions.find(s => s.user_id === userId)
  if (!subscription) return false

  Object.assign(subscription, updates, { updated_at: new Date().toISOString() })

  // Update user if plan changed
  if (updates.plan) {
    const user = db.users.find(u => u.id === userId)
    if (user) user.plan = updates.plan
  }

  saveDb(db)
  return true
}

// Billing History Queries
export function createBillingEntry(
  userId: number,
  helcimInvoiceId: string,
  amount: number,
  currency: string,
  status: string,
  periodStart: string,
  periodEnd: string,
  paidAt?: string
) {
  const db = getDb()
  const id = db.nextBillingHistoryId++

  db.billing_history.push({
    id,
    user_id: userId,
    helcim_invoice_id: helcimInvoiceId,
    amount,
    currency,
    status,
    period_start: periodStart,
    period_end: periodEnd,
    paid_at: paidAt,
    created_at: new Date().toISOString(),
  })

  saveDb(db)
  return { lastID: id }
}

export function getBillingHistory(userId: number, limit: number = 50) {
  const db = getDb()
  return db.billing_history
    .filter(b => b.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}

export function getBillingEntry(id: number) {
  const db = getDb()
  return db.billing_history.find(b => b.id === id)
}

export function updateBillingEntry(id: number, updates: { status?: string; paid_at?: string }) {
  const db = getDb()
  const entry = db.billing_history.find(b => b.id === id)
  if (!entry) return false

  Object.assign(entry, updates)
  saveDb(db)
  return true
}

// Payment Method Queries
export function createPaymentMethod(
  userId: number,
  helcimPaymentMethodId: string,
  last4: string,
  brand: string,
  expMonth: number,
  expYear: number,
  isDefault: boolean = false
) {
  const db = getDb()
  const id = db.nextPaymentMethodId++

  // If this is the default, unset other defaults for this user
  if (isDefault) {
    db.payment_methods
      .filter(pm => pm.user_id === userId && pm.is_default)
      .forEach(pm => (pm.is_default = false))
  }

  db.payment_methods.push({
    id,
    user_id: userId,
    helcim_payment_method_id: helcimPaymentMethodId,
    last4,
    brand,
    exp_month: expMonth,
    exp_year: expYear,
    is_default: isDefault,
    created_at: new Date().toISOString(),
  })

  saveDb(db)
  return { lastID: id }
}

export function getPaymentMethods(userId: number) {
  const db = getDb()
  return db.payment_methods
    .filter(pm => pm.user_id === userId)
    .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0))
}

export function getDefaultPaymentMethod(userId: number) {
  const db = getDb()
  return db.payment_methods.find(pm => pm.user_id === userId && pm.is_default)
}

export function deletePaymentMethod(id: number) {
  const db = getDb()
  const initialLength = db.payment_methods.length
  db.payment_methods = db.payment_methods.filter(pm => pm.id !== id)

  if (db.payment_methods.length < initialLength) {
    saveDb(db)
    return true
  }
  return false
}

// Webhook Queries
export function createWebhookEvent(
  helcimEventId: string,
  eventType: string
) {
  const db = getDb()
  const id = db.nextHelcimWebhookId++

  db.helcim_webhooks.push({
    id,
    helcim_event_id: helcimEventId,
    event_type: eventType,
    processed: false,
    created_at: new Date().toISOString(),
  })

  saveDb(db)
  return { lastID: id }
}

export function getWebhookEvent(helcimEventId: string) {
  const db = getDb()
  return db.helcim_webhooks.find(w => w.helcim_event_id === helcimEventId)
}

export function markWebhookProcessed(id: number) {
  const db = getDb()
  const webhook = db.helcim_webhooks.find(w => w.id === id)
  if (webhook) {
    webhook.processed = true
    saveDb(db)
    return true
  }
  return false
}

export function getUnprocessedWebhooks() {
  const db = getDb()
  return db.helcim_webhooks.filter(w => !w.processed)
}
