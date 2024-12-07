import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat with Atris',
  description: 'Chat with Atris about Audius music, tech, and business',
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </main>
  )
}
