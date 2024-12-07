'use client'

import { useState, useCallback } from 'react'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'
import { sendMessage } from '@/app/actions/chat'
import type { Message } from '../types'

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentStreamedContent, setCurrentStreamedContent] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
    setCurrentStreamedContent('')
    setError(null)
  }, [])

  const processStream = useCallback(async (stream: ReadableStream<any>) => {
    const reader = stream.getReader()
    let streamedContent = ''
    
    try {
      while (true) {
        const { value, done } = await reader.read()
        
        if (done) break
        
        // Handle error messages
        if (value.error) {
          setError(value.error)
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
          setError(null)
          setRetryCount(0)
        }
        
        // Update streamed content
        if (value.message) {
          streamedContent += value.message
          setCurrentStreamedContent(streamedContent)
        }
      }
      
      // Add final message once streaming is complete
      if (streamedContent) {
        addMessage({ role: 'assistant', content: streamedContent })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process message stream')
      console.error('Error processing stream:', err)
    } finally {
      setIsLoading(false)
    }
  }, [addMessage])

  const handleSendMessage = useCallback(async (content: string) => {
    try {
      setIsLoading(true)
      setError(null)
      addMessage({ role: 'user', content })
      
      const stream = await sendMessage(content)
      await processStream(stream)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      console.error('Error sending message:', err)
      setIsLoading(false)
    }
  }, [addMessage, processStream])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <ChatMessages 
          messages={messages}
          isLoading={isLoading}
          streamedContent={currentStreamedContent}
          retryCount={retryCount}
          error={error}
        />
      </div>
      <div className="p-4 border-t">
        <ChatInput 
          onSend={handleSendMessage}
          disabled={isLoading}
        />
      </div>
    </div>
  )
}
