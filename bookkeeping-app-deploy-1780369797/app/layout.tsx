import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import ChatAssistant from '@/components/ChatAssistant'
import { ChatProvider } from '@/lib/ChatContext'

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
      <body className="bg-gray-50 flex flex-col min-h-screen">
        <ChatProvider>
          <Header />
          <div className="flex-1 pt-20 sm:pt-24 w-full overflow-hidden">
            <main className="flex-1 py-8 px-4 w-full">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
          <footer className="bg-white border-t border-gray-200 py-6 text-center text-base text-gray-600 font-medium">
            Made in Canada by a Canadian firm 🍁
          </footer>
          {/* Chat Widget - Floating (Fixed Position) */}
          <ChatAssistant />
        </ChatProvider>
      </body>
    </html>
  )
}
