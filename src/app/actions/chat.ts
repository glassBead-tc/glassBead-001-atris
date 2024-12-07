'use server'

import { AgentChatbot } from '@/lib/chatbot'
import { HumanMessage } from '@langchain/core/messages'
import { ChatResponse } from '@/features/chat/types'
import { revalidatePath } from 'next/cache'

export async function sendMessage(message: string): Promise<ReadableStream<ChatResponse>> {
  const chatbot = new AgentChatbot()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = chatbot.chatStream([new HumanMessage(message)])
        
        for await (const chunk of stream) {
          if (chunk.done) {
            // If we have domain info, send it
            if ('domain' in chunk) {
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
        controller.enqueue({ 
          message: 'Sorry, I encountered an error. Please try again.'
        })
        controller.close()
      } finally {
        revalidatePath('/')
      }
    }
  })
}
