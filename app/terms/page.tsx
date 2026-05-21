'use client'

export default function TermsOfUse() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Use</h1>

      <div className="space-y-2 text-gray-700 text-sm leading-tight">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">1. Acceptance of Terms</h2>
          <p>
            By using Bookkeeping App, you agree to these Terms of Use. If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">2. Service Description</h2>
          <p>
            Bookkeeping App is a cloud-based software tool designed to help small businesses, self-employed individuals, and startups track financial transactions and maintain bookkeeping records in compliance with Canadian accounting standards.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">3. User Accounts</h2>
          <p>
            You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide accurate and complete information during signup</li>
            <li>Maintain the confidentiality of your password</li>
            <li>Not share your account with others</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Use the service only for legitimate business purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">4. Acceptable Use</h2>
          <p>
            You agree not to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the service for illegal activities or tax fraud</li>
            <li>Attempt to hack or gain unauthorized access</li>
            <li>Reverse-engineer or copy the software</li>
            <li>Use the service to harm others or violate laws</li>
            <li>Upload malware or malicious code</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">5. Payment Terms</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Free trial: 14 days with no payment required</li>
            <li>Paid plans auto-renew unless cancelled</li>
            <li>Cancellation available anytime from your account settings</li>
            <li>No refunds for partial months</li>
            <li>Price changes require 30 days notice</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">6. Data Ownership</h2>
          <p>
            You retain all ownership rights to your data. We do not claim ownership of your financial records or business information. However, by using our service, you grant us the right to store, process, and backup your data to provide the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">7. Data Retention & Deletion</h2>
          <p>
            Upon account deletion, we will delete your data within 30 days, except where required by law to retain records. You are responsible for maintaining your own backups.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">8. Service Availability</h2>
          <p>
            While we strive for high uptime, we do not guarantee 100% availability. We may perform maintenance, updates, or emergency repairs that temporarily interrupt the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, our total liability for any claim shall not exceed the amount you paid in the last 12 months. We are not liable for any indirect or consequential damages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">10. Changes to Terms</h2>
          <p>
            We may update these terms at any time. Continued use of the service after changes means you accept the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">11. Governing Law</h2>
          <p>
            These terms are governed by Canadian law. Any disputes shall be resolved in accordance with applicable Canadian federal and provincial laws.
          </p>
        </section>

        <p className="text-sm text-gray-600 mt-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
