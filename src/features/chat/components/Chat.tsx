'use client'

import { useState } from 'react'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'
import { sendMessage } from '@/app/actions/chat'
import type { Message } from '../types'

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentStreamedContent, setCurrentStreamedContent] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message])
  }

  const processStream = async (stream: ReadableStream<any>) => {
    const reader = stream.getReader()
    let streamedContent = ''
    let errorContent = ''
    
    try {
      while (true) {
        const { value, done } = await reader.read()
        
        if (done) break
        
        // Handle error messages
        if (value.error) {
          errorContent = value.error
          setRetryCount(prev => prev + 1)
          continue
        }
        
        // If we got domain info, process it
        if (value.domain) {
          console.log(`Message handled by ${value.domain} domain`)
          if (value.agentContent) {
            console.log('Agent content:', value.agentContent)
          }
          continue
        }
        
        // Reset error state on successful chunk
        if (value.content && !value.error) {
          errorContent = ''
          setRetryCount(0)
        }
        
        // Update the streamed content
        streamedContent += value.content
        setCurrentStreamedContent(
          errorContent ? `${streamedContent}\n${errorContent}` : streamedContent
        )
      }
      
      // Once done, add the complete message if we have content
      if (streamedContent) {
        addMessage({ 
          role: 'assistant', 
          content: errorContent ? `${streamedContent}\n${errorContent}` : streamedContent 
        })
      }
    } finally {
      setCurrentStreamedContent('')
      reader.releaseLock()
    }
  }

  return (
    <div className="flex flex-col h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto p-4">
        <ChatMessages 
          messages={messages} 
          isLoading={isLoading}
          streamedContent={currentStreamedContent}
          retryCount={retryCount}
        />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <ChatInput 
          onSend={async (content) => {
            setIsLoading(true)
            setRetryCount(0)
            addMessage({ role: 'user', content })
            
            try {
              const stream = await sendMessage(content)
              await processStream(stream)
            } catch (error) {
              console.error('Chat error:', error)
              addMessage({ 
                role: 'assistant', 
                content: 'Sorry, I encountered an error. Please try again.' 
              })
            } finally {
              setIsLoading(false)
            }
          }}
          disabled={isLoading}
        />
      </div>
    </div>
  )
}
