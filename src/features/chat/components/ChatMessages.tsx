'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '../types'

interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
  streamedContent?: string
  retryCount?: number
  error?: string | null
}

export function ChatMessages({ 
  messages, 
  isLoading, 
  streamedContent, 
  retryCount = 0,
  error 
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamedContent])

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      ))}
      
      {/* Show streaming content */}
      {streamedContent && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-700">
            <p className="whitespace-pre-wrap">
              {streamedContent}
              {retryCount > 0 && !error && (
                <span className="text-yellow-500">
                  {`\nRetrying... (${retryCount}/3)`}
                </span>
              )}
              {error && (
                <span className="text-red-500">
                  {`\nError: ${error}`}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && !streamedContent && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-700">
            <p className="text-gray-500">Thinking...</p>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  )
}
