'use client'

import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            About BookkeepingApp
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Built for Canadian sole proprietors who want to spend less time on paperwork and more time growing their business.
          </p>
        </div>

        {/* Video Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-12">
          <div className="aspect-video bg-slate-900 flex items-center justify-center">
            <video
              controls
              className="w-full h-full"
              poster="https://res.cloudinary.com/dgnxufaol/image/upload/v1780892837/TITLE_a1nvog.png"
            >
              <source src="https://res.cloudinary.com/dgnxufaol/video/upload/v1780887696/BKA_Intro_ckoedz.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* About Content */}
        <div className="space-y-12">
          {/* Our Mission */}
          <section className="bg-white rounded-lg shadow p-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Our Mission
            </h2>
            <p className="text-slate-700 text-lg mb-4">
              We believe Canadian sole proprietors shouldn't have to choose between growing their business and staying organized for taxes.
            </p>
            <p className="text-slate-700 text-lg">
              BookkeepingApp takes the pain out of bookkeeping—snap receipts, track expenses, and be ready for tax time. No more scrambling. No more missed deductions. No more stress.
            </p>
          </section>

          {/* The Problem */}
          <section className="bg-blue-50 rounded-lg shadow p-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              The Problem We Solve
            </h2>
            <ul className="space-y-3 text-slate-700 text-lg">
              <li className="flex items-start">
                <span className="text-red-600 mr-3 text-xl">✗</span>
                <span>Self-employed people miss deductions because they lack a system</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-3 text-xl">✗</span>
                <span>Tax time arrives and nothing is organized or ready</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-3 text-xl">✗</span>
                <span>CRA penalties for incomplete records and lost deductions</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-3 text-xl">✗</span>
                <span>Hours wasted manually organizing financial data</span>
              </li>
            </ul>
          </section>

          {/* The Solution */}
          <section className="bg-white rounded-lg shadow p-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Our Solution
            </h2>
            <p className="text-slate-700 text-lg mb-6">
              BookkeepingApp makes bookkeeping effortless:
            </p>
            <ul className="space-y-3 text-slate-700 text-lg">
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span><strong>Snap receipts</strong> — AI reads them instantly. No typing.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span><strong>Track expenses</strong> — GST, home office, vehicle expenses organized automatically.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span><strong>Ready for taxes</strong> — Clean, organized records your accountant loves.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 text-xl">✓</span>
                <span><strong>Never miss a deduction</strong> — See exactly what you can claim.</span>
              </li>
            </ul>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Organized?
            </h2>
            <p className="text-lg mb-6 opacity-95">
              Try BookkeepingApp free for 7 days. No credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-block bg-white text-blue-600 hover:bg-slate-100 px-8 py-3 rounded-lg font-semibold transition"
            >
              Start Your 7-Day Trial
            </Link>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-600 text-sm">
            © 2026 BookKeep. All rights reserved. Made with ❤️ for Canadian sole proprietors.
          </p>
        </div>
      </footer>
    </div>
  )
}
