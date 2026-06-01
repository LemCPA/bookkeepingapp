import path from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { DEFAULT_ACCOUNTS } from './default-accounts'

interface DbData {
  users: { id: number; email: string; password_hash: string; name: string; email_verified?: boolean; gst_registered?: boolean; gst_number?: string; default_gst_hst_rate?: number; qbo_access_token?: string; qbo_refresh_token?: string; qbo_realm_id?: string; qbo_connected_at?: string; plan?: string; stripe_customer_id?: string | null; business_name?: string; address_street?: string; city?: string; province?: string; postal_code?: string; phone?: string; business_email?: string; created_at: string }[]
  clients: { id: number; user_id: number; name: string; email?: string; address?: string; gst_registered: boolean; gst_number?: string; created_at: string }[]
  chart_of_accounts: { id: number; code?: string; name: string; type: string; user_id?: number; is_vehicle_expense?: boolean; parent_account_id?: number; category?: string }[]
  transactions: { id: number; user_id: number; client_id?: number; account_id?: number; transaction_date: string; due_date?: string; amount: number; gst_hst_rate?: number; gst_hst_amount?: number; gst_hst_included?: boolean; description: string; type: string; reference_number?: string; created_at: string; updated_at?: string; reconciliation_id?: number; reconciliation_status?: string; internal_notes?: { id: number; content: string; createdAt: string; updatedAt?: string; createdBy?: string }[]; tags?: string[]; audit_trail?: { field: string; oldValue: any; newValue: any; changedAt: string; changedBy?: string }[]; project_id?: number; is_vehicle_expense?: boolean; business_use_percentage?: number }[]
  documents: { id: number; transaction_id: number; file_name: string; file_path: string; file_size: number; uploaded_at: string }[]
  bank_reconciliations: { id: number; user_id: number; account_id: number; statement_date: string; statement_opening_balance: number; statement_closing_balance: number; reconciliation_date: string; status: string; created_at: string; updated_at: string }[]
  reconciliation_items: { id: number; reconciliation_id: number; transaction_id: number; status: string; created_at: string }[]
  recurring_transactions: { id: number; user_id: number; account_id: number; template_name: string; amount: number; description: string; frequency: string; start_date: string; end_date?: string; next_due_date: string; is_active: boolean; gst_hst_rate?: number; gst_hst_amount?: number; created_at: string; updated_at?: string }[]
  transaction_instances: { id: number; recurring_template_id: number; created_transaction_id: number; due_date: string; status: string; created_at: string }[]
  subscriptions: { id: number; user_id: number; plan: string; status: string; stripe_customer_id: string; stripe_subscription_id: string; trial_end_date?: string | null; current_period_start: string; current_period_end: string; created_at: string; canceled_at?: string | null; updated_at: string }[]
  billing_history: { id: number; user_id: number; stripe_invoice_id: string; amount: number; currency: string; status: string; period_start: string; period_end: string; paid_at?: string; created_at: string }[]
  payment_methods: { id: number; user_id: number; stripe_payment_method_id: string; last4: string; brand: string; exp_month: number; exp_year: number; is_default: boolean; created_at: string }[]
  stripe_webhooks: { id: number; stripe_event_id: string; event_type: string; processed: boolean; created_at: string }[]
  vehicle_baseline: { id: number; user_id: number; odometer_reading: number; setup_date: string; notes?: string; created_at: string }[]
  mileage_trips: { id: number; user_id: number; trip_date: string; kilometers: number; destination: string; purpose: string; business_percentage: number; notes?: string; created_at: string; updated_at?: string }[]
  odometer_readings: { id: number; user_id: number; month: string; start_odometer: number; end_odometer: number; business_use_percentage: number; notes?: string; created_at: string; updated_at: string }[]
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
  nextStripeWebhookId: number
  nextVehicleBaselineId: number
  nextMileageTripId: number
  nextOdometerReadingId: number
}

const dbPath = path.join(process.cwd(), '.data', 'bookkeeping.json')
let cachedDb: DbData | null = null
let lastModifiedTime = 0

// Export cache clearing function for production reloads
export function clearDbCache() {
  console.log('Clearing database cache')
  cachedDb = null
  lastModifiedTime = 0
}

export function getDb(): DbData {
  try {
    console.log('getDb called, dbPath:', dbPath)
    console.log('File exists:', existsSync(dbPath))
    if (existsSync(dbPath)) {
      // Check if file has been modified since last load
      const stats = require('fs').statSync(dbPath)
      if (cachedDb && stats.mtimeMs === lastModifiedTime) {
        console.log('Using cached database')
        return cachedDb
      }

      lastModifiedTime = stats.mtimeMs
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
            password_hash: '$2a$10$RF7LHKh03cOdYbEhCyOOVuY56ix696nonxD1S5SsPi4rUbnOF0BAa', // bcrypt hash of demo123
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
      if (!db.stripe_webhooks) {
        db.stripe_webhooks = []
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
      if (!db.nextStripeWebhookId) {
        db.nextStripeWebhookId = 1
      }
      if (!db.vehicle_baseline) {
        db.vehicle_baseline = []
      }
      if (!db.nextVehicleBaselineId) {
        db.nextVehicleBaselineId = 1
      }
      if (!db.mileage_trips) {
        db.mileage_trips = []
      }
      if (!db.nextMileageTripId) {
        db.nextMileageTripId = 1
      }
      if (!db.odometer_readings) {
        db.odometer_readings = []
      }
      if (!db.nextOdometerReadingId) {
        db.nextOdometerReadingId = 1
      }
      if (!db.clients) {
        db.clients = []
      }
      if (!db.nextClientId) {
        db.nextClientId = 1
      }

      // Establish parent-child relationships for account hierarchies
      establishAccountHierarchies(db)

      // Save the updated database with new fields
      saveDb(db)
      cachedDb = db  // Cache the database
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
        password_hash: '$2a$10$RF7LHKh03cOdYbEhCyOOVuY56ix696nonxD1S5SsPi4rUbnOF0BAa', // bcrypt hash of demo123
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
      // Motor Vehicle Expenses (T2125 compliant - from DEFAULT_ACCOUNTS)
      { id: 22, code: '5220', name: 'Motor Vehicle Expenses', type: 'EXPENSE', user_id: 1 },
      { id: 23, code: '5221', name: 'Motor Vehicle Expenses - Fuel', type: 'EXPENSE', user_id: 1 },
      { id: 24, code: '5222', name: 'Motor Vehicle Expenses - Interest (Loan)', type: 'EXPENSE', user_id: 1 },
      { id: 25, code: '5223', name: 'Motor Vehicle Expenses - Insurance', type: 'EXPENSE', user_id: 1 },
      { id: 26, code: '5224', name: 'Motor Vehicle Expenses - Licence and Registration', type: 'EXPENSE', user_id: 1 },
      { id: 27, code: '5225', name: 'Motor Vehicle Expenses - Maintenance and Repairs', type: 'EXPENSE', user_id: 1 },
      { id: 28, code: '5226', name: 'Motor Vehicle Expenses - Parking and Tolls', type: 'EXPENSE', user_id: 1 },
      { id: 29, code: '5227', name: 'Motor Vehicle Expenses - Other', type: 'EXPENSE', user_id: 1 },
      { id: 30, code: '5230', name: 'Capital Cost Allowance (CCA)', type: 'EXPENSE', user_id: 1 },
    ],
    transactions: [],
    documents: [],
    bank_reconciliations: [],
    reconciliation_items: [],
    recurring_transactions: [
      {
        id: 1,
        user_id: 1,
        account_id: 16,
        template_name: 'Monthly Office Supplies',
        amount: 250,
        description: 'Monthly office and cleaning supplies purchase',
        frequency: 'MONTHLY',
        start_date: '2026-05-23',
        end_date: undefined,
        next_due_date: '2026-06-23',
        is_active: true,
        gst_hst_rate: 0,
        gst_hst_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        account_id: 12,
        template_name: 'Quarterly Insurance Premium',
        amount: 1500,
        description: 'Quarterly business liability insurance',
        frequency: 'QUARTERLY',
        start_date: '2026-05-23',
        end_date: undefined,
        next_due_date: '2026-08-23',
        is_active: true,
        gst_hst_rate: 0,
        gst_hst_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        user_id: 1,
        account_id: 18,
        template_name: 'Monthly Office Rent',
        amount: 2500,
        description: 'Monthly office space rental',
        frequency: 'MONTHLY',
        start_date: '2026-05-01',
        end_date: undefined,
        next_due_date: '2026-06-01',
        is_active: true,
        gst_hst_rate: 0,
        gst_hst_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    transaction_instances: [],
    subscriptions: [],
    billing_history: [],
    payment_methods: [],
    stripe_webhooks: [],
    vehicle_baseline: [],
    mileage_trips: [],
    odometer_readings: [],
    nextUserId: 2,
    nextClientId: 3,
    nextAccountId: 32,
    nextTransactionId: 1,
    nextDocumentId: 1,
    nextBankReconciliationId: 1,
    nextReconciliationItemId: 1,
    nextRecurringTransactionId: 4,
    nextTransactionInstanceId: 1,
    nextSubscriptionId: 1,
    nextBillingHistoryId: 1,
    nextPaymentMethodId: 1,
    nextStripeWebhookId: 1,
    nextVehicleBaselineId: 1,
    nextMileageTripId: 1,
    nextOdometerReadingId: 1,
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

  // Create default chart of accounts for this user (imported from shared source of truth)
  const defaultAccounts = DEFAULT_ACCOUNTS

  // Add default accounts for this user
  let nextAccountId = db.nextAccountId
  defaultAccounts.forEach(acc => {
    // Only create accounts that have a code (skip HOME/VEHICLE sub-accounts which have no code)
    if (acc.code) {
      db.chart_of_accounts.push({
        id: nextAccountId++,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        user_id: id,
      })
    }
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
    .sort((a, b) => {
      if (!a.code || !b.code) return (a.code ? -1 : b.code ? 1 : 0)
      return a.code.localeCompare(b.code)
    })
    .map(account => {
      // Add category from DEFAULT_ACCOUNTS based on code
      const defaultAccount = DEFAULT_ACCOUNTS.find(acc => acc.code === account.code)
      return {
        ...account,
        category: defaultAccount?.category
      } as any
    })
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
  referenceNumber?: string,
  isVehicleExpense?: boolean,
  businessUsePercentage?: number,
  sentDate?: string,
  reconciliationStatus?: string,
  gstHstIncluded?: boolean
) {
  const db = getDb()
  const id = db.nextTransactionId++
  const transaction: any = {
    id,
    user_id: userId,
    account_id: accountId,
    transaction_date: transactionDate,
    amount,
    gst_hst_rate: gstHstRate,
    gst_hst_amount: gstHstAmount,
    gst_hst_included: gstHstIncluded || false,
    description,
    type,
    reference_number: referenceNumber,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_vehicle_expense: isVehicleExpense || false,
    business_use_percentage: businessUsePercentage || 100,
  }

  // Add optional invoice fields
  if (sentDate) {
    transaction.sent_date = sentDate
  }
  if (reconciliationStatus) {
    transaction.reconciliation_status = reconciliationStatus
  }

  db.transactions.push(transaction)
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
  referenceNumber?: string,
  gstHstIncluded?: boolean
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
    if (gstHstIncluded !== undefined) transaction.gst_hst_included = gstHstIncluded
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
    .sort((a, b) => {
      if (!a.code || !b.code) return (a.code ? -1 : b.code ? 1 : 0)
      return a.code.localeCompare(b.code)
    })
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
    .sort((a, b) => {
      if (!a.code || !b.code) return (a.code ? -1 : b.code ? 1 : 0)
      return a.code.localeCompare(b.code)
    })
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
  // Parse dates explicitly and validate format
  const startParts = startMonth.split('-')
  const endParts = endMonth.split('-')

  if (startParts.length !== 2 || endParts.length !== 2) {
    throw new Error(`Invalid month format. Expected YYYY-MM, got ${startMonth} and ${endMonth}`)
  }

  const startYear = parseInt(startParts[0], 10)
  const startM = parseInt(startParts[1], 10)
  const endYear = parseInt(endParts[0], 10)
  const endM = parseInt(endParts[1], 10)

  if (isNaN(startYear) || isNaN(startM) || isNaN(endYear) || isNaN(endM)) {
    throw new Error(`Invalid month values. startMonth=${startMonth}, endMonth=${endMonth}`)
  }

  console.log('Income statement: Parsing dates - startMonth:', startMonth, '[', startYear, String(startM).padStart(2, '0'), '], endMonth:', endMonth, '[', endYear, String(endM).padStart(2, '0'), ']')

  // Generate months array
  const months: string[] = []

  for (let y = startYear; y <= endYear; y++) {
    const monthStart = y === startYear ? startM : 1
    const monthEnd = y === endYear ? endM : 12

    for (let m = monthStart; m <= monthEnd; m++) {
      const monthStr = `${y}-${String(m).padStart(2, '0')}`
      months.push(monthStr)
    }
  }

  console.log('Income statement: Generated months array:', months)

  // Get all income and expense accounts for this user
  const accounts = db.chart_of_accounts
    .filter(a => a.user_id === userId && a.type && ['INCOME', 'EXPENSE'].includes(a.type))
    .sort((a, b) => {
      // Handle undefined codes (HOME/VEHICLE parent accounts)
      if (!a.code || !b.code) return (a.code ? -1 : b.code ? 1 : 0)
      return a.code.localeCompare(b.code)
    })

  // Initialize data structure: account -> month -> balance
  const accountData: { [accountId: number]: { [month: string]: number } } = {}
  accounts.forEach(a => {
    accountData[a.id] = {}
    months.forEach(m => {
      accountData[a.id][m] = 0
    })
  })

  // Calculate balances (exclude vehicle expenses from regular accounts, they'll be calculated separately)
  db.transactions
    .filter(t => t.user_id === userId && !t.is_vehicle_expense)
    .forEach(t => {
      const account = db.chart_of_accounts.find(a => a.id === t.account_id)
      const tMonth = t.transaction_date.substring(0, 7)
      if (account && months.includes(tMonth) && accountData[account.id]) {
        accountData[account.id][tMonth] = (accountData[account.id][tMonth] || 0) + t.amount
      }
    })

  // Calculate vehicle expenses separately (deductible amount only)
  const vehicleExpensesByMonth: { [month: string]: number } = {}
  months.forEach(m => {
    vehicleExpensesByMonth[m] = 0
  })

  db.transactions
    .filter(t => t.user_id === userId && t.is_vehicle_expense)
    .forEach(t => {
      const tMonth = t.transaction_date.substring(0, 7)
      if (months.includes(tMonth)) {
        const businessUsePercentage = t.business_use_percentage || 100
        const deductibleAmount = t.amount * (businessUsePercentage / 100)
        vehicleExpensesByMonth[tMonth] = (vehicleExpensesByMonth[tMonth] || 0) + deductibleAmount
      }
    })

  // Calculate totals per month (including vehicle expenses)
  const monthlyTotals: { [month: string]: { income: number; expenses: number; netIncome: number } } = {}
  months.forEach(m => {
    let income = 0
    let expenses = 0
    accounts.forEach(a => {
      const balance = accountData[a.id][m] || 0
      if (a.type === 'INCOME') income += balance
      if (a.type === 'EXPENSE') expenses += balance
    })
    // Add motor vehicle expenses to total expenses
    expenses += vehicleExpensesByMonth[m] || 0
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
  let totalVehicleExpenses = 0

  accounts.forEach(a => {
    const total = accountTotals[a.id] || 0
    if (a.type === 'INCOME') totalIncome += total
    if (a.type === 'EXPENSE') totalExpenses += total
  })

  // Add motor vehicle expenses to total
  months.forEach(m => {
    totalVehicleExpenses += vehicleExpensesByMonth[m] || 0
  })
  totalExpenses += totalVehicleExpenses

  // Build accounts list with motor vehicle expenses as a virtual account
  // Exclude all motor vehicle accounts (5220-5229) from the display and show only the total
  const accountsList = accounts
    .filter(a => {
      // Exclude all Motor Vehicle Expense accounts (codes 5220-5229)
      // We'll show only the total in a single line instead
      if (a.code && a.code >= '5220' && a.code <= '5229') {
        return false
      }
      return true
    })
    .map(a => ({
      id: a.id,
      type: a.type,
      name: a.name,
      code: a.code,
      monthlyBalances: accountData[a.id],
      total: accountTotals[a.id] || 0,
    }))

  // Add motor vehicle expenses as a single line item showing the total
  if (totalVehicleExpenses > 0) {
    accountsList.push({
      id: 99999, // Virtual ID for motor vehicle expenses total
      type: 'EXPENSE',
      name: 'Total Vehicle Expenses',
      code: 'MOTOR',
      monthlyBalances: vehicleExpensesByMonth,
      total: totalVehicleExpenses,
    })
  }

  console.log('Income statement: Returning months array:', months)
  return {
    months,
    accounts: accountsList,
    monthlyTotals,
    grandTotals: {
      income: totalIncome,
      expenses: totalExpenses,
      netIncome: totalIncome - totalExpenses,
    },
  }
}

export function getExpenseByCategoryData(userId: number, startMonth: string, endMonth: string, selectedCategories: number[]) {
  const db = getDb()

  // Parse start and end months
  const startParts = startMonth.split('-')
  const endParts = endMonth.split('-')

  if (startParts.length !== 2 || endParts.length !== 2) {
    throw new Error(`Invalid month format. Expected YYYY-MM, got ${startMonth} and ${endMonth}`)
  }

  const startYear = parseInt(startParts[0], 10)
  const startM = parseInt(startParts[1], 10)
  const endYear = parseInt(endParts[0], 10)
  const endM = parseInt(endParts[1], 10)

  if (isNaN(startYear) || isNaN(startM) || isNaN(endYear) || isNaN(endM)) {
    throw new Error(`Invalid month values. startMonth=${startMonth}, endMonth=${endMonth}`)
  }

  // Generate months array
  const months: string[] = []
  for (let y = startYear; y <= endYear; y++) {
    const monthStart = y === startYear ? startM : 1
    const monthEnd = y === endYear ? endM : 12

    for (let m = monthStart; m <= monthEnd; m++) {
      const monthStr = `${y}-${String(m).padStart(2, '0')}`
      months.push(monthStr)
    }
  }

  // Get all expense accounts for this user
  const allExpenseAccounts = db.chart_of_accounts
    .filter(a => a.user_id === userId && a.type === 'EXPENSE')
    .sort((a, b) => {
      if (!a.code || !b.code) return (a.code ? -1 : b.code ? 1 : 0)
      return a.code.localeCompare(b.code)
    })

  // Use selected categories, or all if none selected
  const categoriesToShow = selectedCategories.length > 0
    ? selectedCategories
    : allExpenseAccounts.map(a => a.id)

  const accounts = allExpenseAccounts.filter(a => categoriesToShow.includes(a.id))

  // Initialize data structure
  const categoryData: { [accountId: number]: { [month: string]: number } } = {}
  accounts.forEach(a => {
    categoryData[a.id] = {}
    months.forEach(m => {
      categoryData[a.id][m] = 0
    })
  })

  // Calculate balances from transactions
  db.transactions
    .filter(t => t.user_id === userId && !t.is_vehicle_expense)
    .forEach(t => {
      const account = db.chart_of_accounts.find(a => a.id === t.account_id)
      const tMonth = t.transaction_date.substring(0, 7)
      if (account && months.includes(tMonth) && categoryData[account.id]) {
        categoryData[account.id][tMonth] = (categoryData[account.id][tMonth] || 0) + t.amount
      }
    })

  // Calculate monthly totals per month
  const monthlyTotals: { [month: string]: number } = {}
  months.forEach(m => {
    let total = 0
    accounts.forEach(a => {
      total += categoryData[a.id][m] || 0
    })
    monthlyTotals[m] = total
  })

  // Calculate totals per account
  const categoryTotals: { [accountId: number]: number } = {}
  accounts.forEach(a => {
    categoryTotals[a.id] = months.reduce((sum, m) => sum + (categoryData[a.id][m] || 0), 0)
  })

  // Calculate grand total
  const grandTotal = months.reduce((sum, m) => sum + (monthlyTotals[m] || 0), 0)

  // Build categories list
  const categoriesList = accounts.map(a => ({
    id: a.id,
    type: a.type,
    name: a.name,
    code: a.code,
    monthlyBalances: categoryData[a.id],
    total: categoryTotals[a.id] || 0,
  }))

  return {
    months,
    categories: categoriesList,
    monthlyTotals,
    grandTotal,
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

  const variance = recon.statement_closing_balance - (recon.statement_opening_balance + matchedAmount)
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

  if (frequency === 'WEEKLY') {
    const date = new Date(startDate)
    date.setDate(date.getDate() + 7)
    nextDueDate = date.toISOString().split('T')[0]
  } else if (frequency === 'BIWEEKLY') {
    const date = new Date(startDate)
    date.setDate(date.getDate() + 14)
    nextDueDate = date.toISOString().split('T')[0]
  } else if (frequency === 'MONTHLY') {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + 1)
    nextDueDate = date.toISOString().split('T')[0]
  } else if (frequency === 'QUARTERLY') {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + 3)
    nextDueDate = date.toISOString().split('T')[0]
  } else if (frequency === 'ANNUALLY') {
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
    stripe_customer_id: '',
    stripe_subscription_id: '',
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
    stripe_invoice_id: helcimInvoiceId,
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
    stripe_payment_method_id: helcimPaymentMethodId,
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

// Webhook Queries (Stripe webhooks are handled in /api/billing/webhook/route.ts)
export function createWebhookEvent(
  eventId: string,
  eventType: string
) {
  // Webhook event logging handled by Stripe webhook route
  console.log(`Webhook event recorded: ${eventType}`)
  return { lastID: 0 }
}

export function getWebhookEvent(eventId: string) {
  // Stripe webhooks don't need local persistence for deduplication
  return null
}

export function markWebhookProcessed(id: number) {
  // Stripe webhooks are handled server-side
  return true
}

export function getUnprocessedWebhooks() {
  // No unprocessed webhooks - Stripe handles them directly
  return []
}

// Vehicle Baseline queries (Mileage tracking for CRA deductions)
export function getVehicleBaseline(userId: number) {
  const db = getDb()
  return db.vehicle_baseline.find(v => v.user_id === userId)
}

export function setVehicleBaseline(
  userId: number,
  odometerReading: number,
  notes?: string,
  setupDate?: string
) {
  const db = getDb()
  const existing = db.vehicle_baseline.find(v => v.user_id === userId)
  const dateToUse = setupDate || new Date().toISOString().split('T')[0]

  if (existing) {
    // Update existing baseline
    existing.odometer_reading = odometerReading
    if (notes !== undefined) existing.notes = notes
    existing.setup_date = dateToUse
  } else {
    // Create new baseline
    const id = db.nextVehicleBaselineId++
    db.vehicle_baseline.push({
      id,
      user_id: userId,
      odometer_reading: odometerReading,
      setup_date: dateToUse,
      notes,
      created_at: new Date().toISOString(),
    })
  }

  saveDb(db)
  return true
}

// Mileage Trip queries (Per-trip tracking)
export function getMileageTrips(userId: number, year?: number) {
  const db = getDb()
  let trips = db.mileage_trips.filter(t => t.user_id === userId)

  if (year) {
    trips = trips.filter(t => t.trip_date.startsWith(year.toString()))
  }

  return trips.sort((a, b) => new Date(b.trip_date).getTime() - new Date(a.trip_date).getTime())
}

export function getMileageTrip(id: number) {
  const db = getDb()
  console.log('[getMileageTrip] Called with id:', id)
  console.log('[getMileageTrip] mileage_trips array exists:', !!db.mileage_trips)
  console.log('[getMileageTrip] mileage_trips length:', db.mileage_trips?.length)
  if (db.mileage_trips && db.mileage_trips.length > 0) {
    console.log('[getMileageTrip] First trip:', JSON.stringify(db.mileage_trips[0]))
  }
  const result = db.mileage_trips.find(t => {
    console.log('[getMileageTrip] Checking trip:', { id: t.id, comparing: id, match: t.id === id })
    return t.id === id
  })
  console.log('[getMileageTrip] Result:', result ? 'FOUND' : 'NOT FOUND')
  return result
}

export function createMileageTrip(
  userId: number,
  tripDate: string,
  kilometers: number,
  destination: string,
  purpose: string,
  businessPercentage?: number,
  notes?: string
) {
  const db = getDb()
  const id = db.nextMileageTripId++

  // Auto-set business percentage based on purpose if not provided
  let finalBusinessPercentage = businessPercentage ?? 100
  if (!businessPercentage) {
    if (purpose === 'personal') finalBusinessPercentage = 0
    else if (purpose === 'mixed') finalBusinessPercentage = 50
    // else default to 100 for 'business'
  }

  db.mileage_trips.push({
    id,
    user_id: userId,
    trip_date: tripDate,
    kilometers,
    destination,
    purpose,
    business_percentage: finalBusinessPercentage,
    notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  saveDb(db)
  return { lastID: id }
}

export function updateMileageTrip(
  id: number,
  tripDate?: string,
  kilometers?: number,
  destination?: string,
  purpose?: string,
  businessPercentage?: number,
  notes?: string
) {
  const db = getDb()
  const trip = db.mileage_trips.find(t => t.id === id)

  if (trip) {
    if (tripDate !== undefined) trip.trip_date = tripDate
    if (kilometers !== undefined) trip.kilometers = kilometers
    if (destination !== undefined) trip.destination = destination
    if (purpose !== undefined) trip.purpose = purpose
    if (businessPercentage !== undefined) trip.business_percentage = businessPercentage
    if (notes !== undefined) trip.notes = notes
    trip.updated_at = new Date().toISOString()

    saveDb(db)
    return true
  }

  return false
}

export function deleteMileageTrip(id: number) {
  const db = getDb()
  const initialLength = db.mileage_trips.length
  db.mileage_trips = db.mileage_trips.filter(t => t.id !== id)

  if (db.mileage_trips.length < initialLength) {
    saveDb(db)
    return true
  }

  return false
}

// Odometer readings functions
export function getOdometerReadings(userId: number, year?: number) {
  const db = getDb()
  let readings = db.odometer_readings.filter(r => r.user_id === userId)

  if (year) {
    readings = readings.filter(r => {
      const readingYear = parseInt(r.month.split('-')[0])
      return readingYear === year
    })
  }

  return readings.sort((a, b) => b.month.localeCompare(a.month))
}

export function createOdometerReading(
  userId: number,
  month: string,
  startOdometer: number,
  endOdometer: number,
  businessUsePercentage: number,
  notes?: string
) {
  const db = getDb()
  const id = db.nextOdometerReadingId++
  const now = new Date().toISOString()

  db.odometer_readings.push({
    id,
    user_id: userId,
    month,
    start_odometer: startOdometer,
    end_odometer: endOdometer,
    business_use_percentage: businessUsePercentage,
    notes,
    created_at: now,
    updated_at: now,
  })

  saveDb(db)
  return { lastID: id }
}

export function getOdometerReading(readingId: number) {
  const db = getDb()
  return db.odometer_readings.find(r => r.id === readingId)
}

export function updateOdometerReading(
  readingId: number,
  month?: string,
  startOdometer?: number,
  endOdometer?: number,
  businessUsePercentage?: number,
  notes?: string
) {
  const db = getDb()
  const reading = db.odometer_readings.find(r => r.id === readingId)

  if (reading) {
    if (month !== undefined) reading.month = month
    if (startOdometer !== undefined) reading.start_odometer = startOdometer
    if (endOdometer !== undefined) reading.end_odometer = endOdometer
    if (businessUsePercentage !== undefined) reading.business_use_percentage = businessUsePercentage
    if (notes !== undefined) reading.notes = notes
    reading.updated_at = new Date().toISOString()

    saveDb(db)
    return true
  }

  return false
}

export function deleteOdometerReading(readingId: number) {
  const db = getDb()
  const initialLength = db.odometer_readings.length
  db.odometer_readings = db.odometer_readings.filter(r => r.id !== readingId)

  if (db.odometer_readings.length < initialLength) {
    saveDb(db)
    return true
  }

  return false
}

/**
 * Establish parent-child relationships for account hierarchies
 * Links HOME category accounts to 9945 (Business-Use-of-Home Expenses)
 * Links VEHICLE category accounts to 9281 (Motor Vehicle Expenses)
 */
function establishAccountHierarchies(db: DbData) {
  // Find parent account IDs
  const homeParent = db.chart_of_accounts.find(a => a.code === '9945')
  const vehicleParent = db.chart_of_accounts.find(a => a.code === '9281')

  // Link HOME category accounts to 9945
  if (homeParent) {
    db.chart_of_accounts.forEach(account => {
      if (account.category === 'HOME' && account.code !== '9945') {
        account.parent_account_id = homeParent.id
      }
    })
  }

  // Link VEHICLE category accounts to 9281
  if (vehicleParent) {
    db.chart_of_accounts.forEach(account => {
      if (account.category === 'VEHICLE' && account.code !== '9281') {
        account.parent_account_id = vehicleParent.id
      }
    })
  }
}
