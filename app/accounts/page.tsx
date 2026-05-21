export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
        <p className="text-gray-600 mt-2">Manage your accounts and account structure</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            + New Account
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          <div className="p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Assets</h3>
          </div>
          <div className="p-4">
            <p className="text-gray-600 text-sm">No accounts yet</p>
          </div>

          <div className="p-4 bg-gray-50 mt-4">
            <h3 className="font-semibold text-gray-900">Liabilities</h3>
          </div>
          <div className="p-4">
            <p className="text-gray-600 text-sm">No accounts yet</p>
          </div>

          <div className="p-4 bg-gray-50 mt-4">
            <h3 className="font-semibold text-gray-900">Equity</h3>
          </div>
          <div className="p-4">
            <p className="text-gray-600 text-sm">No accounts yet</p>
          </div>

          <div className="p-4 bg-gray-50 mt-4">
            <h3 className="font-semibold text-gray-900">Income</h3>
          </div>
          <div className="p-4">
            <p className="text-gray-600 text-sm">No accounts yet</p>
          </div>

          <div className="p-4 bg-gray-50 mt-4">
            <h3 className="font-semibold text-gray-900">Expenses</h3>
          </div>
          <div className="p-4">
            <p className="text-gray-600 text-sm">No accounts yet</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Your chart of accounts will be populated with default accounts when you create your first transaction.
        </p>
      </div>
    </div>
  )
}
