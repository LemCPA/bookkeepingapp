'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface RecurringTransaction {
  id: number
  client_id: number
  client_name: string
  account_id: number
  account_name: string
  template_name: string
  amount: number
  description: string
  frequency: string
  start_date: string
  end_date?: string
  next_due_date: string
  is_active: boolean
  gst_hst_rate?: number
  gst_hst_amount?: number
  created_at: string
  updated_at?: string
}

export default function RecurringTransactionsPage() {
  const [templates, setTemplates] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      const response = await fetch('/api/recurring-transactions')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching recurring transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handlePauseResume(id: number, currentStatus: boolean) {
    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error updating recurring transaction:', error)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error deleting recurring transaction:', error)
    }
  }

  const activeCount = templates.filter(t => t.is_active).length
  const inactiveCount = templates.length - activeCount

  if (loading) {
    return <div className="text-center py-8">Loading recurring transactions...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recurring Transactions</h1>
          <p className="text-gray-600 mt-2">Manage transaction templates that repeat regularly</p>
        </div>
        <Link
          href="/recurring-transactions/new"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          ➕ New Template
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Total Templates</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{templates.length}</p>
          <p className="text-xs text-gray-500 mt-1">templates configured</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-1">actively generating transactions</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">Paused</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{inactiveCount}</p>
          <p className="text-xs text-gray-500 mt-1">templates paused</p>
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {templates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">No recurring transaction templates yet</p>
            <Link href="/recurring-transactions/new" className="text-blue-600 hover:text-blue-800 font-medium">
              Create your first template →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Template Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Client</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Frequency</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Next Due</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templates.map(template => (
                  <tr key={template.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{template.template_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{template.client_name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${(template.amount + (template.gst_hst_amount || 0)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {template.frequency}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(template.next_due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {template.is_active ? (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Paused
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => handlePauseResume(template.id, template.is_active)}
                        className={`font-medium ${
                          template.is_active
                            ? 'text-orange-600 hover:text-orange-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {template.is_active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 About Recurring Transactions</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Templates automatically generate new transactions on their due dates</li>
          <li>Transactions are created with the same amount, account, and description</li>
          <li>Pause templates without deleting them to stop generating transactions</li>
          <li>Set an end date to automatically stop a recurring transaction</li>
          <li>Edit templates to update frequency or amounts for future transactions</li>
        </ul>
      </div>
    </div>
  )
}
