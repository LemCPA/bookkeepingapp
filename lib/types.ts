export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
export type TransactionType = 'INVOICE' | 'RECEIPT' | 'ADJUSTMENT'

export interface Client {
  id: number
  name: string
  email?: string
  address?: string
  gst_registered: boolean
  gst_number?: string
  created_at: string
}

export interface ChartOfAccount {
  id: number
  code: string
  name: string
  type: AccountType
  client_id?: number
  is_vehicle_expense?: boolean
  category?: 'BUSINESS' | 'HOME' | 'VEHICLE'
}

export interface AuditEntry {
  field: string
  oldValue: any
  newValue: any
  changedAt: string
  changedBy?: string
}

export interface NoteEntry {
  id: number
  content: string
  createdAt: string
  updatedAt?: string
  createdBy?: string
}

export interface Transaction {
  id: number
  client_id: number
  account_id: number
  transaction_date: string
  amount: number
  gst_hst_rate: number
  gst_hst_amount: number
  description: string
  type: TransactionType
  reference_number?: string
  created_at: string
  updated_at?: string
  internal_notes?: NoteEntry[]
  tags?: string[]
  audit_trail?: AuditEntry[]
  project_id?: number
}

export interface Document {
  id: number
  transaction_id: number
  file_name: string
  file_path: string
  file_size: number
  uploaded_at: string
}

export interface BalanceSheetReport {
  period: string
  assets: { [key: string]: number }
  liabilities: { [key: string]: number }
  equity: { [key: string]: number }
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
}

export interface IncomeStatementReport {
  period: string
  income: { [key: string]: number }
  expenses: { [key: string]: number }
  totalIncome: number
  totalExpenses: number
  netIncome: number
}

export interface DocumentAnalysisResponse {
  date: string | null
  amount: number | null
  description: string | null
  vendor_name: string | null
  type: 'RECEIPT' | 'INVOICE' | null
  account_type: 'ASSET' | 'EXPENSE' | null
  gst_hst_amount: number
  gst_hst_rate: number
}

export interface BankReconciliation {
  id: number
  client_id: number
  account_id: number
  statement_date: string
  statement_opening_balance: number
  statement_closing_balance: number
  reconciliation_date: string
  status: 'PENDING' | 'COMPLETED'
  created_at: string
  updated_at: string
  // Computed fields added by API
  account_name?: string
  matched_amount?: number
  variance?: number
  matched_count?: number
  unmatched_count?: number
}

export interface ReconciliationItem {
  id: number
  reconciliation_id: number
  transaction_id: number
  status: 'MATCHED' | 'UNMATCHED'
  created_at: string
  // Joined fields
  transaction?: Transaction
}

