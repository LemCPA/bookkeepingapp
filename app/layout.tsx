import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Bookkeeping App',
  description: 'Simple bookkeeping software',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-8 px-4">
          {children}
        </main>
        <footer className="bg-white border-t border-gray-200 mt-16 py-6 text-center text-base text-gray-600 font-medium">
          Made in Canada by a Canadian firm 🍁
        </footer>
      </body>
    </html>
  )
}
