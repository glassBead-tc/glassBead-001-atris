'use server'

import { AgentChatbot } from '@/lib/chatbot'
import { Message, ChatResponse } from '@/features/chat/types'
import { revalidatePath } from 'next/cache'

export async function sendMessage(message: string): Promise<ReadableStream<ChatResponse>> {
  const chatbot = new AgentChatbot()

  return new ReadableStream({
    async start(controller) {
      try {
        const messages: Message[] = [{ role: 'user', content: message }]
        const stream = chatbot.chatStream(messages)
        
        for await (const chunk of stream) {
          if (chunk.done) {
            // If we have domain info, send it
            if (chunk.domain) {
              controller.enqueue({
                message: '',
                domain: chunk.domain,
                agentContent: chunk.agentContent
              })
            }
            controller.close()
          } else {
            controller.enqueue({ message: chunk.content })
          }
        }
      } catch (error) {
        console.error('Error in chat stream:', error)
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        controller.enqueue({ 
          message: `Sorry, I encountered an error: ${errorMessage}`
        })
        controller.close()
      } finally {
        revalidatePath('/chat')
      }
    }
  })
}
