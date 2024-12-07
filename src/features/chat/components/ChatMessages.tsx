'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '../types'

interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
  streamedContent?: string
  retryCount?: number
}

export function ChatMessages({ messages, isLoading, streamedContent, retryCount = 0 }: ChatMessagesProps) {
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
              {retryCount > 0 && (
                <span className="text-yellow-500">
                  {`\nRetrying... (${retryCount}/3)`}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      
      {/* Show loading indicator only when not streaming */}
      {isLoading && !streamedContent && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-700">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}
