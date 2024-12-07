import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import { ChatMessage } from '../message/ChatMessage';

interface ChatThreadProps {
  messages: Message[];
  isProcessing?: boolean;
}

export function ChatThread({ messages, isProcessing }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-gray-500">
          <p>Start a conversation by typing a message below.</p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isProcessing && (
            <div className="flex animate-pulse">
              <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-2">
                <div className="h-4 w-12 bg-gray-300 rounded"></div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
