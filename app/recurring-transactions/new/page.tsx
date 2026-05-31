'use client'

import { useEffect, useState } from 'react'
import { ChartOfAccount } from '@/lib/types'
import { createAuthenticatedFetch } from '@/lib/auth'

export default function NewRecurringTransactionPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    category: 'BUSINESS',
    templateName: '',
    accountId: '',
    subAccountName: '',
    amount: '',
    description: '',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    gstRate: '5',
    pstRate: '0',
    customPstRate: '',
  })

  useEffect(() => {
    const authenticatedFetch = createAuthenticatedFetch()

    Promise.all([
      authenticatedFetch('/api/chart-of-accounts'),
      authenticatedFetch('/api/user/settings'),
    ]).then(async ([accountsRes, settingsRes]) => {
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(Array.isArray(accountsData) ? accountsData : [])
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        const defaultRate = settingsData.default_gst_hst_rate || 0

        // Map default rate back to GST/PST components
        // If rate <= 5, it's just GST. Otherwise GST=5 and PST is the remainder
        const gstComponent = defaultRate <= 5 ? defaultRate : 5
        const pstComponent = defaultRate > 5 ? defaultRate - 5 : 0

        // PST options mapping
        const pstOptions: { [key: number]: string } = {
          0: '0-ab',
          6: '6-sk',
          7: '7-bc',
          8: '8-on',
          10: '10-pe',
          9.975: '9.975-qc',
        }

        // Find the matching PST option or set to custom
        let pstOption = pstOptions[pstComponent] || 'custom'
        let customPstRate = ''
        if (pstComponent > 0 && !pstOptions[pstComponent]) {
          customPstRate = pstComponent.toString()
        }

        setFormData(prev => ({
          ...prev,
          gstRate: gstComponent.toString(),
          pstRate: pstOption,
          customPstRate: customPstRate,
        }))
      }
    }).catch(() => setAccounts([])).finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const amount = parseFloat(formData.amount)
      const gstRate = parseFloat(formData.gstRate)

      let pstRate = 0
      if (formData.pstRate === 'custom') {
        pstRate = parseFloat(formData.customPstRate)
      } else {
        // Extract numeric part from province code (e.g., "8-on" -> 8)
        const rateStr = formData.pstRate.split('-')[0]
        pstRate = parseFloat(rateStr)
      }

      const totalRate = gstRate + pstRate
      const taxAmount = amount * (totalRate / 100)

      const authenticatedFetch = createAuthenticatedFetch()

      // Build request body
      const requestBody: any = {
        template_name: formData.templateName,
        amount: amount,
        description: formData.description,
        frequency: formData.frequency,
        start_date: formData.startDate,
        end_date: formData.endDate || null,
        gst_hst_rate: totalRate,
        gst_hst_amount: taxAmount,
        category: formData.category,
      }

      // Add account or sub-account based on category
      if (formData.category === 'BUSINESS' && formData.accountId) {
        requestBody.account_id = parseInt(formData.accountId)
      } else if (formData.category === 'HOME' || formData.category === 'VEHICLE') {
        requestBody.sub_account_name = formData.subAccountName
      }

      const response = await authenticatedFetch('/api/recurring-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) throw new Error('Failed to create recurring transaction')

      window.location.href = '/recurring-transactions'
    } catch (error) {
      console.error('Error creating recurring transaction:', error)
      alert('Error creating recurring transaction')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">New Recurring Template</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
          <input
            type="text"
            required
            value={formData.templateName}
            onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
            placeholder="e.g., Monthly Rent, Quarterly Insurance"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
            <select
              required
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUALLY">Annually</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              required
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as 'BUSINESS' | 'HOME' | 'VEHICLE', accountId: '', subAccountName: '' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="BUSINESS">Business</option>
            <option value="HOME">Home</option>
            <option value="VEHICLE">Vehicle</option>
          </select>
        </div>

        {formData.category === 'BUSINESS' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
            <select
              required
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select an account</option>
              {accounts
                .filter(account => (account.type === 'EXPENSE' || account.type === 'INCOME') && account.code !== '9945')
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {formData.category === 'HOME' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type *</label>
            <select
              required
              value={formData.subAccountName}
              onChange={(e) => setFormData({ ...formData, subAccountName: e.target.value, accountId: 'HOME' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select expense type</option>
              <option value="Heat">Heat</option>
              <option value="Electricity">Electricity</option>
              <option value="Insurance">Insurance</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Mortgage Interest">Mortgage Interest</option>
              <option value="Property Taxes">Property Taxes</option>
              <option value="Other Expenses">Other Expenses</option>
            </select>
          </div>
        )}

        {formData.category === 'VEHICLE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Expense Type *</label>
            <select
              required
              value={formData.subAccountName}
              onChange={(e) => setFormData({ ...formData, subAccountName: e.target.value, accountId: 'VEHICLE' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select vehicle expense type</option>
              <option value="Fuel & Oil">Fuel & Oil</option>
              <option value="Interest">Interest</option>
              <option value="Insurance">Insurance</option>
              <option value="License and Registration">License and Registration</option>
              <option value="Maintenance and Repairs">Maintenance and Repairs</option>
              <option value="Leasing">Leasing</option>
              <option value="Electricity for Zero-Emission Vehicles">Electricity for Zero-Emission Vehicles</option>
              <option value="Other Vehicle Expenses">Other Vehicle Expenses</option>
              <option value="Business Parking Fees">Business Parking Fees</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST (Federal)</label>
            <select
              value={formData.gstRate}
              onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="0">No GST</option>
              <option value="5">5% GST</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PST/HST/QST (Provincial)</label>
            <select
              value={formData.pstRate}
              onChange={(e) => setFormData({ ...formData, pstRate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="0-ab">No PST/HST (Alberta)</option>
              <option value="6-sk">6% PST (Saskatchewan)</option>
              <option value="7-bc">7% PST (British Columbia)</option>
              <option value="8-mb">8% PST (Manitoba)</option>
              <option value="8-on">8% HST (Ontario)</option>
              <option value="10-pe">10% HST (Prince Edward Island)</option>
              <option value="10-ns">10% HST (Nova Scotia)</option>
              <option value="10-nb">10% HST (New Brunswick)</option>
              <option value="10-nl">10% HST (Newfoundland & Labrador)</option>
              <option value="9.975-qc">9.975% QST (Quebec - in addition to GST)</option>
              <option value="custom">Custom PST/HST Rate</option>
            </select>
          </div>
        </div>

        {formData.pstRate === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom PST/HST Rate (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.customPstRate}
              onChange={(e) => setFormData({ ...formData, customPstRate: e.target.value })}
              placeholder="Enter custom provincial tax rate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {(formData.gstRate || formData.pstRate) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Total Tax Rate: </span>
              {(() => {
                const gst = parseFloat(formData.gstRate)
                let pst = 0
                if (formData.pstRate === 'custom') {
                  pst = parseFloat(formData.customPstRate) || 0
                } else if (formData.pstRate !== '0') {
                  const rateStr = formData.pstRate.split('-')[0]
                  pst = parseFloat(rateStr)
                }
                return (gst + pst).toFixed(2)
              })()}%
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Template
          </button>
          <a
            href="/recurring-transactions"
            className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 font-medium text-center"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
