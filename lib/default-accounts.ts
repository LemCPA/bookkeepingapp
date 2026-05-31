/**
 * Default T2125 Chart of Accounts for Canadian Sole Proprietors
 * Uses official CRA T2125 form line numbers as account codes
 * Single source of truth for all default account definitions
 * Used by API, database initialization, and UI fallbacks
 */

export interface DefaultAccount {
  code: string
  name: string
  type: 'INCOME' | 'EXPENSE'
}

export const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  // Income (T2125 Lines)
  { code: '8000', name: 'Gross Business Income', type: 'INCOME' },
  { code: '8230', name: 'Other Income', type: 'INCOME' },

  // Expenses (T2125 Line Numbers)
  { code: '8521', name: 'Advertising', type: 'EXPENSE' },
  { code: '8523', name: 'Meals and Entertainment', type: 'EXPENSE' },
  { code: '8590', name: 'Bad Debts', type: 'EXPENSE' },
  { code: '8690', name: 'Insurance', type: 'EXPENSE' },
  { code: '8710', name: 'Interest and Bank Charges', type: 'EXPENSE' },
  { code: '8760', name: 'Business Taxes, Fees, Licenses, and Memberships', type: 'EXPENSE' },
  { code: '8810', name: 'Office Expenses', type: 'EXPENSE' },
  { code: '8811', name: 'Office Stationery and Supplies', type: 'EXPENSE' },
  { code: '8860', name: 'Professional Fees (Accounting, Legal)', type: 'EXPENSE' },
  { code: '8871', name: 'Management and Administration Fees', type: 'EXPENSE' },
  { code: '8910', name: 'Rent', type: 'EXPENSE' },
  { code: '8960', name: 'Repairs and Maintenance', type: 'EXPENSE' },
  { code: '9060', name: 'Salaries, Wages, and Benefits', type: 'EXPENSE' },
  { code: '9180', name: 'Property Taxes', type: 'EXPENSE' },
  { code: '9200', name: 'Travel Expenses', type: 'EXPENSE' },
  { code: '9220', name: 'Utilities', type: 'EXPENSE' },
  { code: '9224', name: 'Fuel Costs (Excluding Motor Vehicles)', type: 'EXPENSE' },
  { code: '9275', name: 'Delivery, Freight, and Express', type: 'EXPENSE' },
  { code: '9281', name: 'Motor Vehicle Expenses', type: 'EXPENSE' },
  { code: '9270', name: 'Other Expenses', type: 'EXPENSE' },
  { code: '9936', name: 'Capital Cost Allowance (CCA)', type: 'EXPENSE' },
]
