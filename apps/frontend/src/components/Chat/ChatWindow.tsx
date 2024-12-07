import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Message } from 'ai';
import { useRef, useState, ReactElement, FormEvent, useEffect } from "react";
import axios from 'axios';
import { Button } from '@audius/harmony';

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

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) {
      toast.warn('Please enter a message');
      return;
    }

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
        threadId: threadId
      });

      const aiMessage: Message = {
        id: Date.now().toString(),
        content: response.data.content || 'No response from AI',
        role: 'assistant'
      };

      setMessages(prevMessages => [...prevMessages, aiMessage]);
      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Restore the user message if send fails
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-window flex flex-col h-[600px] bg-white rounded-xl">
      {titleText && (
        <h2 className="text-xl font-bold p-4 border-b border-[#F7F7F7] text-[#858199]">
          {titleText}
        </h2>
      )}
      
      <div 
        ref={messageContainerRef} 
        className="flex-grow overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          emptyStateComponent
        ) : (
          messages.map((message) => (
            <ChatMessageBubble 
              key={message.id} 
              message={message} 
              aiEmoji={props.emoji}
            />
          ))
        )}
        {isLoading && (
          <div className="text-center text-[#858199]">
            Thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-[#F7F7F7] flex items-center gap-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-grow p-2 rounded-lg bg-[#FCFCFC] border border-[#F7F7F7] focus:border-[#7E1BCC] focus:ring-1 focus:ring-[#7E1BCC] outline-none"
          disabled={isLoading}
        />
        <Button 
          type="submit"
          disabled={isLoading}
          color="gradient"
          variant="primary"
          size="default"
          className="!bg-[#7E1BCC] hover:!bg-[#6A16AC] disabled:opacity-50"
        >
          Send
        </Button>
      </form>

      <ToastContainer 
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
