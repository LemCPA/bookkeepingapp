/**
 * Default T2125 Chart of Accounts for Canadian Sole Proprietors
 * Uses official CRA T2125 form line numbers as account codes
 * Organized by category: Business, Home, Vehicle
 * Single source of truth for all default account definitions
 */

export interface DefaultAccount {
  code?: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  category: 'BUSINESS' | 'HOME' | 'VEHICLE'
  subAccounts?: DefaultAccount[]
}

export const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  // BUSINESS INCOME
  { code: '8000', name: 'Gross Business Income', type: 'INCOME', category: 'BUSINESS' },
  { code: '8230', name: 'Other Income', type: 'INCOME', category: 'BUSINESS' },

  // BUSINESS EXPENSES
  { code: '8521', name: 'Advertising', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8523', name: 'Meals and Entertainment', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8590', name: 'Bad Debts', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8690', name: 'Insurance', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8710', name: 'Interest and Bank Charges', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8760', name: 'Business Taxes, Fees, Licenses, and Memberships', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8810', name: 'Office Expenses', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8811', name: 'Office Stationery and Supplies', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8860', name: 'Professional Fees (Accounting, Legal)', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8871', name: 'Management and Administration Fees', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8910', name: 'Rent', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '8960', name: 'Repairs and Maintenance', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '9060', name: 'Salaries, Wages, and Benefits', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '9180', name: 'Property Taxes', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '9200', name: 'Travel Expenses', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '9220', name: 'Utilities', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '9224', name: 'Fuel Costs (Excluding Motor Vehicles)', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '9270', name: 'Other Expenses', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '9275', name: 'Delivery, Freight, and Express', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '9936', name: 'Capital Cost Allowance (CCA)', type: 'EXPENSE', category: 'BUSINESS' },

  // GROUP ACCOUNTS (parent accounts for hierarchical display - no direct transactions)
  { code: '9945', name: 'Business-Use-of-Home Expenses', type: 'EXPENSE', category: 'BUSINESS' },
  { code: '9281', name: 'Motor Vehicle Expenses', type: 'EXPENSE', category: 'BUSINESS' },

  // HOME SUB-ACCOUNTS (children of 9945 - category sets parent relationship)
  { code: '9945-01', name: 'Heat', type: 'EXPENSE', category: 'HOME' },
  { code: '9945-02', name: 'Electricity', type: 'EXPENSE', category: 'HOME' },
  { code: '9945-03', name: 'Insurance (Home)', type: 'EXPENSE', category: 'HOME' },
  { code: '9945-04', name: 'Property Tax', type: 'EXPENSE', category: 'HOME' },
  { code: '9945-05', name: 'Mortgage Interest', type: 'EXPENSE', category: 'HOME' },
  { code: '9945-06', name: 'Repairs and Maintenance (Home)', type: 'EXPENSE', category: 'HOME' },
  { code: '9945-07', name: 'Supplies (Home)', type: 'EXPENSE', category: 'HOME' },
  { code: '9945-08', name: 'Telephone', type: 'EXPENSE', category: 'HOME' },
  { code: '9945-09', name: 'Rent (Home)', type: 'EXPENSE', category: 'HOME' },

  // VEHICLE SUB-ACCOUNTS (children of 9281 - category sets parent relationship)
  { code: '9281-01', name: 'Fuel & Oil', type: 'EXPENSE', category: 'VEHICLE' },
  { code: '9281-02', name: 'Interest', type: 'EXPENSE', category: 'VEHICLE' },
  { code: '9281-03', name: 'Insurance (Vehicle)', type: 'EXPENSE', category: 'VEHICLE' },
  { code: '9281-04', name: 'License & Registration', type: 'EXPENSE', category: 'VEHICLE' },
  { code: '9281-05', name: 'Maintenance & Repairs', type: 'EXPENSE', category: 'VEHICLE' },
  { code: '9281-06', name: 'Lease/Rental', type: 'EXPENSE', category: 'VEHICLE' },
  { code: '9281-07', name: 'Parking', type: 'EXPENSE', category: 'VEHICLE' },
]
