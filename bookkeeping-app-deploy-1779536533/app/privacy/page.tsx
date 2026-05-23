'use client'

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy & PIPEDA Compliance</h1>

      <div className="space-y-2 text-gray-700 text-sm leading-tight">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">1. PIPEDA Compliance</h2>
          <p>
            Bookkeeping App is committed to protecting your personal information in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA) and other applicable Canadian privacy laws.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">2. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account information (name, email, business details)</li>
            <li>Financial transaction data you enter</li>
            <li>Usage analytics and system logs</li>
            <li>Payment information (processed securely)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide and maintain the bookkeeping service</li>
            <li>Process payments and send billing information</li>
            <li>Improve our software and services</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">4. Your Privacy Rights</h2>
          <p>
            Under PIPEDA, you have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access your personal information</li>
            <li>Request corrections to inaccurate data</li>
            <li>Understand how your data is used</li>
            <li>Request deletion of your data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">5. Data Security</h2>
          <p>
            We employ industry-standard security measures to protect your information. However, no system is 100% secure. You use this service at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">6. Contact Us</h2>
          <p>
            For privacy concerns or PIPEDA-related requests, contact us at support@bookkeepingapp.ca
          </p>
        </section>

        <p className="text-sm text-gray-600 mt-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
