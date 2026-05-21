export default function GSTFilingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">GST Filing</h1>
        <p className="text-gray-600 mt-2">Manage your GST/HST filings and compliance</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filing Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">GST Collected</p>
            <p className="text-2xl font-bold text-blue-600">$0.00</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">GST Paid</p>
            <p className="text-2xl font-bold text-green-600">$0.00</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Net GST Due</p>
            <p className="text-2xl font-bold text-purple-600">$0.00</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filing Periods</h2>
        <div className="space-y-3">
          <p className="text-gray-600">No GST filings recorded yet. Transaction data with GST amounts will appear here.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> GST amounts are automatically extracted from scanned receipts and invoices.
          Make sure to upload your documents to get accurate GST reporting.
        </p>
      </div>
    </div>
  )
}
