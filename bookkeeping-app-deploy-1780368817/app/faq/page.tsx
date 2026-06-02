'use client'

export default function FAQPage() {
  const faqs = [
    {
      question: "What is Bookkeeping App?",
      answer: "Bookkeeping App is a cloud-based bookkeeping software designed for small businesses, self-employed individuals, and startups in Canada. It helps you track financial transactions, maintain accurate records, and generate reports in compliance with Canadian accounting standards."
    },
    {
      question: "Who should use Bookkeeping App?",
      answer: "Bookkeeping App is ideal for sole proprietors, freelancers, small businesses, and startups with basic bookkeeping needs. It's perfect if you're looking for a simple, affordable way to track your finances without the complexity of enterprise solutions like QuickBooks Online."
    },
    {
      question: "What are the service limitations?",
      answer: "Bookkeeping App is limited to 50 transactions per month and one client account per user. If you have higher transaction volumes or need to manage multiple client accounts, we recommend QuickBooks Online or similar enterprise solutions."
    },
    {
      question: "Is there a free trial?",
      answer: "Yes! We offer a 14-day free trial when you sign up. No credit card required during the trial. After the trial ends, you can choose to upgrade to a paid plan or continue with limited features on the free tier."
    },
    {
      question: "What are the pricing plans?",
      answer: "We offer three plans: Free (limited features, $0/month), Starter ($9/month for up to 5 clients), and Professional ($29/month for unlimited clients). Annual billing is available with a discount."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes! You can cancel your subscription anytime from your account settings. There are no long-term contracts or cancellation fees. If you cancel mid-month, you'll keep access until the end of your billing period."
    },
    {
      question: "Is my data secure and PIPEDA compliant?",
      answer: "Yes. We implement industry-standard security practices and comply with PIPEDA (Personal Information Protection and Electronic Documents Act) and other Canadian privacy laws. Your financial data is encrypted and stored securely."
    },
    {
      question: "How do I back up my data?",
      answer: "You can export your data anytime from the Settings page. We recommend regular backups. You are responsible for maintaining your own backups of critical financial data."
    },
    {
      question: "Can I import transactions from my bank?",
      answer: "Currently, you can manually enter transactions or use our bulk import feature to upload multiple transactions at once. We're working on bank integration features for future releases."
    },
    {
      question: "Is Bookkeeping App a replacement for an accountant?",
      answer: "No. Bookkeeping App is a record-keeping tool only. It does not constitute professional accounting or tax advice. For tax planning, complex accounting matters, and year-end filings, you should consult with a qualified accountant or tax professional."
    },
    {
      question: "What accounting standards do you follow?",
      answer: "Bookkeeping App is designed to comply with Canadian accounting standards and GST/HST regulations. However, you should verify all records with a qualified accountant before tax filing."
    },
    {
      question: "What happens if I exceed 100 transactions in a month?",
      answer: "If you're consistently exceeding 50 transactions per month, you should upgrade to a higher plan or consider using QuickBooks Online. Exceeding limits may result in reduced performance or service suspension."
    },
    {
      question: "Can I manage multiple businesses with one account?",
      answer: "Currently, each account is limited to one client. If you need to manage multiple businesses, you can create separate accounts for each business."
    },
    {
      question: "What file formats can I export?",
      answer: "You can export your data as CSV and PDF formats. This allows you to use your data in Excel, other accounting software, or share reports with your accountant."
    },
    {
      question: "Is the app available on mobile?",
      answer: "Bookkeeping App is a web-based application that works on desktop and tablet browsers. Mobile support is planned for future releases."
    },
    {
      question: "What should I do if I encounter an error?",
      answer: "If you encounter any errors, please contact our support team at support@bookkeepingapp.ca with a description of the issue and any error messages you received. We'll help you resolve it as quickly as possible."
    },
    {
      question: "How often is my data backed up?",
      answer: "Your data is automatically backed up regularly to secure cloud storage. In the event of data loss, we will do our best to restore your data, but we recommend maintaining your own backups as well."
    },
    {
      question: "Can I change my subscription plan anytime?",
      answer: "Yes, you can upgrade or downgrade your plan anytime from your account settings. Plan changes take effect at the start of your next billing cycle."
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h1>

      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h2>
            <p className="text-gray-700 text-sm leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Didn't find your answer?</h2>
        <p className="text-gray-700 mb-4">
          If you have additional questions, please contact our support team at{' '}
          <a href="mailto:support@bookkeepingapp.ca" className="text-blue-600 hover:underline">
            support@bookkeepingapp.ca
          </a>
        </p>
      </div>

      <p className="text-sm text-gray-600 mt-8">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  )
}
