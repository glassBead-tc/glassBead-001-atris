import { Chat } from '@/features/chat/components/Chat'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
          Welcome to Atris
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Your AI assistant for everything Audius - from music discovery to technical details.
        </p>
        <a
          href="/chat"
          className="inline-block bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Start Chatting
        </a>
      </div>
      
      <div className="mt-16 grid md:grid-cols-3 gap-8">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Music Discovery
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Find trending tracks, discover new artists, and explore playlists on Audius.
          </p>
        </div>
        
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Technical Info
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Learn about Audius protocol, architecture, and technical documentation.
          </p>
        </div>
        
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Business Insights
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Stay updated on Audius business developments and ecosystem growth.
          </p>
        </div>
      </div>
    </main>
  )
}
