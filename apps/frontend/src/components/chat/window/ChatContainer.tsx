import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/lib/types';
import { sendMessage } from '@/lib/api';
import { ChatInput } from '../input/ChatInput';
import { ChatThread } from '../thread/ChatThread';

const DEFAULT_THREAD_ID = 'default';

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: Date.now(),
      threadId: DEFAULT_THREAD_ID,
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const response = await sendMessage(content);
      
      // Update user message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' } 
            : msg
        )
      );

      if (response.error) {
        throw new Error(response.error);
      }

      const assistantMessage: Message = {
        id: uuidv4(),
        content: response.response,
        role: 'assistant',
        timestamp: Date.now(),
        threadId: DEFAULT_THREAD_ID,
        status: 'sent'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        const errorMessage: Message = {
          id: uuidv4(),
          content: `Sorry, I encountered an error processing your request: ${err.message}`,
          role: 'assistant',
          timestamp: Date.now(),
          threadId: DEFAULT_THREAD_ID,
          status: 'error'
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        const errorMessage: Message = {
          id: uuidv4(),
          content: 'Sorry, an unknown error occurred',
          role: 'assistant',
          timestamp: Date.now(),
          threadId: DEFAULT_THREAD_ID,
          status: 'error'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Chat</h1>
      </div>
      
      <ChatThread 
        messages={messages} 
        isProcessing={isProcessing} 
      />
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        disabled={isProcessing} 
      />
    </div>
  );
}
