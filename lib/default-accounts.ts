/**
 * Default T2125 Chart of Accounts for Canadian Sole Proprietors
 * Single source of truth for all default account definitions
 * Used by API, database initialization, and UI fallbacks
 */

export interface DefaultAccount {
  code: string
  name: string
  type: 'INCOME' | 'EXPENSE'
}

export const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  // Income (T2125 Line 10400)
  { code: '8000', name: 'Gross Income', type: 'INCOME' },
  { code: '8230', name: 'Other Income', type: 'INCOME' },

  // Expenses
  { code: '5000', name: 'Meals and Entertainment', type: 'EXPENSE' },
  { code: '5010', name: 'Office Supplies', type: 'EXPENSE' },
  { code: '5020', name: 'Telephone and Internet', type: 'EXPENSE' },
  { code: '5030', name: 'Utilities', type: 'EXPENSE' },
  { code: '5040', name: 'Professional Services', type: 'EXPENSE' },
  { code: '5050', name: 'Advertising and Marketing', type: 'EXPENSE' },
  { code: '5100', name: 'Office Rent', type: 'EXPENSE' },
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

  // Motor Vehicle Expenses (standardized T2125 format)
  { code: '5220', name: 'Motor Vehicle Expenses', type: 'EXPENSE' },
  { code: '5221', name: 'Motor Vehicle Expenses - Fuel', type: 'EXPENSE' },
  { code: '5222', name: 'Motor Vehicle Expenses - Interest (Loan)', type: 'EXPENSE' },
  { code: '5223', name: 'Motor Vehicle Expenses - Insurance', type: 'EXPENSE' },
  { code: '5224', name: 'Motor Vehicle Expenses - Licence and Registration', type: 'EXPENSE' },
  { code: '5225', name: 'Motor Vehicle Expenses - Maintenance and Repairs', type: 'EXPENSE' },
  { code: '5226', name: 'Motor Vehicle Expenses - Parking and Tolls', type: 'EXPENSE' },
  { code: '5227', name: 'Motor Vehicle Expenses - Other', type: 'EXPENSE' },

  // Other Expenses
  { code: '5230', name: 'Capital Cost Allowance (CCA)', type: 'EXPENSE' },
  { code: '5240', name: 'Other Expenses', type: 'EXPENSE' },
]
