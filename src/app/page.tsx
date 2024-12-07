import { Chat } from '@/features/chat/components/Chat'

export default function Home() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8">
        Chat about Audius
      </h1>
      <Chat />
    </div>
  )
}
