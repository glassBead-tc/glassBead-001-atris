import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Atris | Your Audius AI Assistant',
  description: 'Chat with Atris about Audius music, tech, and business',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-white dark:bg-gray-900">
          <header className="border-b border-gray-200 dark:border-gray-700">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex justify-between items-center">
                <a href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
                  Atris
                </a>
                <div className="flex space-x-4">
                  <a href="/chat" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    Chat
                  </a>
                </div>
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
