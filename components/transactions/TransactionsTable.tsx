'use client'

import Link from 'next/link'
import { TransactionFilters } from '@/lib/filterUtils'

interface Transaction {
  id: number
  transaction_date: string
  description: string
  type: string
  amount: number
  account_name: string
  gst_hst_amount?: number
}

interface TransactionsTableProps {
  transactions: Transaction[]
  filters: TransactionFilters
  loading: boolean
  onSortChange: (sortBy: 'date' | 'amount') => void
}

export default function TransactionsTable({
  transactions,
  filters,
  loading,
  onSortChange,
}: TransactionsTableProps) {
  const sortBy = filters.sortBy || 'date'
  const sortOrder = filters.sortOrder || 'desc'

  const getSortIndicator = (column: 'date' | 'amount') => {
    if (sortBy !== column) return '⇅'
    return sortOrder === 'desc' ? '↓' : '↑'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading transactions...</p>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <p className="text-gray-500 text-center">
          No transactions found. Try adjusting your filters.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              <button
                onClick={() => onSortChange('date')}
                className="flex items-center gap-2 hover:text-blue-600"
              >
                Date {getSortIndicator('date')}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Description
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Account
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
              <button
                onClick={() => onSortChange('amount')}
                className="flex items-center justify-end gap-2 w-full hover:text-blue-600"
              >
                Subtotal {getSortIndicator('amount')}
              </button>
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
              GST/HST
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
              Total
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <tr
              key={transaction.id}
              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <td className="px-4 py-3 text-sm text-gray-900">
                {new Date(transaction.transaction_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {transaction.description}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    transaction.type === 'INVOICE'
                      ? 'bg-blue-100 text-blue-800'
                      : transaction.type === 'RECEIPT'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {transaction.type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {transaction.account_name}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">
                ${transaction.amount.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-900">
                {transaction.gst_hst_amount && transaction.gst_hst_amount > 0
                  ? `$${transaction.gst_hst_amount.toFixed(2)}`
                  : '-'}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">
                ${(transaction.amount + (transaction.gst_hst_amount || 0)).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <Link
                  href={`/transactions/${transaction.id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
