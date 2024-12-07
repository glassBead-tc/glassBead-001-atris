import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Message } from 'ai';
import { useRef, useState, ReactElement, FormEvent, useEffect } from "react";
import axios from 'axios';

import { ChatMessageBubble } from "./ChatMessageBubble";

export function ChatWindow(props: {
  endpoint: string,
  emptyStateComponent: ReactElement,
  placeholder?: string,
  titleText?: string,
  emoji?: string;
  showIngestForm?: boolean,
  showIntermediateStepsToggle?: boolean
  threadId: string
}) {
  const { 
    endpoint, 
    emptyStateComponent, 
    placeholder = "Type a message...", 
    titleText = "AI Chat", 
    threadId 
  } = props;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user'
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(endpoint, {
        content: input,
        role: 'user',
        thread_id: threadId
      });

      const aiMessage: Message = {
        id: Date.now().toString(),
        content: response.data.response,
        role: 'assistant'
      };

      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-window">
      {titleText && <h2 className="chat-title">{titleText}</h2>}
      <div 
        ref={messageContainerRef} 
        className="flex-grow overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            {emptyStateComponent}
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessageBubble 
              key={index} 
              message={message} 
              sources={[]} 
              aiEmoji="🤖" 
            />
          ))
        )}
        {isLoading && (
          <div className="text-center text-gray-500">
            Thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-grow p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>

      <ToastContainer />
    </div>
  );
}
