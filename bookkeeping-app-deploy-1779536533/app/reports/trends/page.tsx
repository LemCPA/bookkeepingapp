'use client'
import { useEffect, useState } from 'react'
import { createAuthenticatedFetch } from '@/lib/auth'

export default function TrendsReport() {
  const [activeTab, setActiveTab] = useState('trend')
  const [trendData, setTrendData] = useState<any[]>([])
  const [startMonth, setStartMonth] = useState('')
  const [endMonth, setEndMonth] = useState('')
  const [comparisonData, setComparisonData] = useState<any>(null)
  const [period1, setPeriod1] = useState('')
  const [period2, setPeriod2] = useState('')
  const [yoyData, setYoyData] = useState<any[]>([])
  const [yoyYear, setYoyYear] = useState(new Date().getFullYear().toString())
  const [loading, setLoading] = useState({trend: false, comparison: false, yoy: false})

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  const fetchTrend = async () => {
    setLoading({...loading, trend: true})
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const res = await authenticatedFetch(`/api/reports/trends?startMonth=${startMonth}&endMonth=${endMonth}&type=trend`)
      if (res.ok) {
        const data = await res.json()
        setTrendData(data.data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading({...loading, trend: false})
  }

  const fetchComparison = async () => {
    setLoading({...loading, comparison: true})
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const res = await authenticatedFetch(`/api/reports/trends?period1=${period1}&period2=${period2}&type=period`)
      if (res.ok) {
        const data = await res.json()
        setComparisonData(data.data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading({...loading, comparison: false})
  }

  const fetchYoY = async () => {
    setLoading({...loading, yoy: true})
    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const res = await authenticatedFetch(`/api/reports/trends?year=${yoyYear}&type=yoy`)
      if (res.ok) {
        const data = await res.json()
        setYoyData(data.data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading({...loading, yoy: false})
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Multi-Period Reporting & Trends</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Report Options</h2>
              </div>

              {/* Tab Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
                <div className="space-y-2">
                  {[
                    { key: 'trend', label: 'Trend Analysis' },
                    { key: 'comparison', label: 'Period Comparison' },
                    { key: 'yoy', label: 'Year-over-Year' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        activeTab === tab.key
                          ? 'bg-blue-100 text-blue-900 font-medium border border-blue-300'
                          : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3">
            {/* Trend Analysis Tab */}
            {activeTab === 'trend' && <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Trend Analysis</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Month</label>
                    <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Month</label>
                    <input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <button onClick={fetchTrend} disabled={loading.trend} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium">{loading.trend ? 'Loading...' : 'Generate Trend'}</button>
              </div>
              {trendData.length > 0 && <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full"><thead><tr className="border-b bg-gray-50"><th className="px-6 py-3 text-left">Month</th><th className="px-6 py-3 text-right">Revenue</th><th className="px-6 py-3 text-right">Expenses</th><th className="px-6 py-3 text-right">Net</th><th className="px-6 py-3 text-right">Margin</th></tr></thead>
                  <tbody>{trendData.map(r => <tr key={r.month}><td className="px-6 py-4">{r.month}</td><td className="px-6 py-4 text-right text-green-600">{formatCurrency(r.revenue)}</td><td className="px-6 py-4 text-right text-red-600">{formatCurrency(r.expenses)}</td><td className="px-6 py-4 text-right font-bold">{formatCurrency(r.netIncome)}</td><td className="px-6 py-4 text-right">{(r.revenue > 0 ? (r.netIncome/r.revenue)*100 : 0).toFixed(1)}%</td></tr>)}</tbody>
                </table>
              </div>}
            </div>}

            {/* Comparison Tab */}
            {activeTab === 'comparison' && <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Period Comparison</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period 1</label>
                    <input type="month" value={period1} onChange={e => setPeriod1(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period 2</label>
                    <input type="month" value={period2} onChange={e => setPeriod2(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <button onClick={fetchComparison} disabled={loading.comparison} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium">{loading.comparison ? 'Loading...' : 'Generate Comparison'}</button>
              </div>
              {comparisonData && <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold mb-4">Comparison: {comparisonData.month1} vs {comparisonData.month2}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4"><p className="text-sm text-gray-600">Revenue</p><p className="text-2xl font-bold">{formatCurrency(comparisonData.revenueChange)}</p><p className="text-sm">{comparisonData.revenueChangePercent.toFixed(1)}%</p></div>
                  <div className="border rounded-lg p-4"><p className="text-sm text-gray-600">Expenses</p><p className="text-2xl font-bold">{formatCurrency(comparisonData.expensesChange)}</p><p className="text-sm">{comparisonData.expensesChangePercent.toFixed(1)}%</p></div>
                  <div className="border rounded-lg p-4"><p className="text-sm text-gray-600">Net Income</p><p className="text-2xl font-bold">{formatCurrency(comparisonData.netIncomeChange)}</p><p className="text-sm">{comparisonData.netIncomeChangePercent.toFixed(1)}%</p></div>
                </div>
              </div>}
            </div>}

            {/* YoY Tab */}
            {activeTab === 'yoy' && <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Year-over-Year</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" value={yoyYear} onChange={e => setYoyYear(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" min="2000" />
                </div>
                <button onClick={fetchYoY} disabled={loading.yoy} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium">{loading.yoy ? 'Loading...' : 'Generate YoY'}</button>
              </div>
              {yoyData.length > 0 && <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full"><thead><tr className="border-b bg-gray-50"><th className="px-6 py-3 text-left">Month</th><th className="px-6 py-3 text-right">Revenue %</th><th className="px-6 py-3 text-right">Expenses %</th><th className="px-6 py-3 text-right">Income %</th></tr></thead>
                  <tbody>{yoyData.map(r => <tr key={r.month1}><td className="px-6 py-4">{r.month1.slice(5)}</td><td className="px-6 py-4 text-right">{r.revenueChangePercent.toFixed(1)}%</td><td className="px-6 py-4 text-right">{r.expensesChangePercent.toFixed(1)}%</td><td className="px-6 py-4 text-right">{r.netIncomeChangePercent.toFixed(1)}%</td></tr>)}</tbody>
                </table>
              </div>}
            </div>}
          </div>
        </div>
      </div>
    </div>
  )
}
