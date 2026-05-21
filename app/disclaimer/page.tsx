'use client'

export default function Disclaimer() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Disclaimer</h1>

      <div className="space-y-2 text-gray-700 text-sm leading-tight">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">AS-IS Service</h2>
          <p>
            Bookkeeping App is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, error-free, or secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">User Responsibility</h2>
          <p>
            <strong>You are solely responsible for:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Maintaining accurate and complete financial records</li>
            <li>Compliance with all federal and provincial tax laws</li>
            <li>Compliance with GST/HST regulations</li>
            <li>Proper categorization and reporting of transactions</li>
            <li>Regular backups of your data</li>
            <li>Keeping login credentials secure</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Limitation of Liability</h2>
          <p>
            Bookkeeping App and its owners are not liable for:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Data loss or corruption</li>
            <li>Loss of income or business interruption</li>
            <li>Tax penalties or fines resulting from inaccurate records</li>
            <li>Errors or omissions in your use of the service</li>
            <li>Any indirect, incidental, or consequential damages</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Not Professional Accounting Advice</h2>
          <p>
            This software is a record-keeping tool only. It does not constitute professional accounting, bookkeeping, or tax advice. For tax planning and complex accounting matters, consult with a qualified accountant or tax professional.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Accuracy of Information</h2>
          <p>
            While we strive to provide accurate information and calculations, we cannot guarantee 100% accuracy. You should verify all calculations and reports independently, particularly for tax filing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Service Modifications</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue the service at any time with reasonable notice. We are not liable for any changes or discontinuation of the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Data Security</h2>
          <p>
            While we implement industry-standard security practices, no online service is completely secure. You use this service at your own risk. We recommend:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Using a strong, unique password</li>
            <li>Enabling two-factor authentication when available</li>
            <li>Regularly backing up your data</li>
            <li>Not sharing login credentials</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Third-Party Services</h2>
          <p>
            This service may integrate with third-party payment processors and other services. We are not responsible for third-party service availability, accuracy, or security. You agree to their terms of service as well.
          </p>
        </section>

        <p className="text-sm text-gray-600 mt-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
