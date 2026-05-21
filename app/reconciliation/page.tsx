export default function ReconciliationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bank Reconciliation</h1>
        <p className="text-gray-600 mt-2">Reconcile your bank statements with recorded transactions</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Reconciliation History</h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            + New Reconciliation
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 text-center py-8">No reconciliations yet</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Unreconciled</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-500 mt-1">transactions</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Reconciled</p>
          <p className="text-2xl font-bold text-green-600">0</p>
          <p className="text-xs text-gray-500 mt-1">transactions</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Last Reconciled</p>
          <p className="text-lg font-bold text-gray-900">Never</p>
          <p className="text-xs text-gray-500 mt-1">-</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How Reconciliation Works</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Start a new reconciliation and enter your bank statement details</li>
          <li>Match your recorded transactions with bank statement items</li>
          <li>Mark any discrepancies or outstanding items</li>
          <li>Complete the reconciliation when everything matches</li>
        </ol>
      </div>
    </div>
  )
}
