'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function BackupPage() {
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleExportFullBackup = async () => {
    setExporting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/backup/export-full')
      if (!response.ok) throw new Error('Failed to export backup')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bookkeeping-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage({ type: 'success', text: 'Full backup downloaded successfully' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to export backup' })
    } finally {
      setExporting(false)
    }
  }

  const handleExportTransactionsCSV = async () => {
    setExporting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/backup/export-transactions?format=csv')
      if (!response.ok) throw new Error('Failed to export transactions')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage({ type: 'success', text: 'Transactions exported successfully' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to export transactions' })
    } finally {
      setExporting(false)
    }
  }

  const handleExportClientsCSV = async () => {
    setExporting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/backup/export-clients?format=csv')
      if (!response.ok) throw new Error('Failed to export clients')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage({ type: 'success', text: 'Clients exported successfully' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to export clients' })
    } finally {
      setExporting(false)
    }
  }

  const handleExportChartOfAccountsCSV = async () => {
    setExporting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/backup/export-coa?format=csv')
      if (!response.ok) throw new Error('Failed to export chart of accounts')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chart-of-accounts-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage({ type: 'success', text: 'Chart of Accounts exported successfully' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to export chart of accounts' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Backup & Export</h1>
        <p className="text-gray-600 mt-1">Download your data or create backups</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Full Backup Section */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">💾 Full Backup</h2>
          <p className="text-gray-600 text-sm mt-1">Download your complete database as JSON</p>
        </div>
        <p className="text-sm text-gray-600">
          A complete backup of all your data including transactions, clients, chart of accounts, documents, and reconciliation records.
          This is the safest way to backup your entire bookkeeping database.
        </p>
        <button
          onClick={handleExportFullBackup}
          disabled={exporting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {exporting ? 'Exporting...' : 'Download Full Backup (JSON)'}
        </button>
      </div>

      {/* CSV Exports Section */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">📊 Export as CSV</h2>
          <p className="text-gray-600 text-sm mt-1">Export specific data as CSV files for use in Excel or other tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Transactions</h3>
            <p className="text-sm text-gray-600 mb-3">All transactions with dates, amounts, clients, and descriptions</p>
            <button
              onClick={handleExportTransactionsCSV}
              disabled={exporting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              Export Transactions
            </button>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Clients</h3>
            <p className="text-sm text-gray-600 mb-3">All client contact information and addresses</p>
            <button
              onClick={handleExportClientsCSV}
              disabled={exporting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              Export Clients
            </button>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Chart of Accounts</h3>
            <p className="text-sm text-gray-600 mb-3">All account codes and account types</p>
            <button
              onClick={handleExportChartOfAccountsCSV}
              disabled={exporting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              Export Chart of Accounts
            </button>
          </div>
        </div>
      </div>

      {/* Data Management Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Backup Tips</h3>
        <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
          <li>Download a full backup regularly (weekly recommended)</li>
          <li>Store backups in a secure location or cloud drive</li>
          <li>CSV exports are useful for external analysis in Excel or accounting software</li>
          <li>Keep backups for at least 7 years for tax compliance</li>
        </ul>
      </div>

      <div className="flex gap-4">
        <Link href="/" className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
