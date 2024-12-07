import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Message } from 'ai';
import { useRef, useState, ReactElement, FormEvent, useEffect } from "react";
import { Button } from '@audius/harmony';
import { ChatMessageBubble } from "../message/ChatMessageBubble";
import { IntermediateStep } from "../steps/IntermediateStep";

export function ChatWindow(props: {
  endpoint?: string,
  emptyStateComponent: ReactElement,
  placeholder?: string,
  titleText?: string,
  emoji?: string;
  showIngestForm?: boolean,
  showIntermediateStepsToggle?: boolean
  threadId: string
}) {
  const { 
    endpoint = '', 
    emptyStateComponent, 
    placeholder = "Type a message...", 
    titleText = "AI Chat",
    showIntermediateStepsToggle = false,
    threadId = uuidv4()
  } = props;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
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
      // Create a temporary message for streaming updates
      const streamingMessage: Message = {
        id: Date.now().toString(),
        content: '',
        role: 'assistant'
      };
      setMessages(prevMessages => [...prevMessages, streamingMessage]);

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: input,
          threadId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from agent');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the stream chunk and parse the JSON
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const output = JSON.parse(line);
            
            // Update the streaming message with new content
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === streamingMessage.id
                  ? { ...msg, content: msg.content + (output.formattedResponse || output.content || '') }
                  : msg
              )
            );

            // If there are intermediate steps, show them
            if (output.intermediateSteps) {
              // Update your intermediate steps UI here
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e);
          }
        }
      }

      toast.success('Response generated successfully');
    } catch (error) {
      console.error('Error generating response:', error);
      toast.error('Failed to generate response. Please try again.');
      
      // Remove the failed message
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== userMessage.id)
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-window flex flex-col h-[600px] bg-white rounded-xl">
      <div className="border-b border-[#F7F7F7] p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#858199]">
            {titleText}
          </h2>
          {showIntermediateStepsToggle && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-[#858199]">Show steps</label>
              <input
                type="checkbox"
                checked={showSteps}
                onChange={(e) => setShowSteps(e.target.checked)}
                className="form-checkbox h-4 w-4 text-[#7E1BCC] rounded border-[#F7F7F7]"
              />
            </div>
          )}
        </div>
      </div>
      
      <div 
        ref={messageContainerRef} 
        className="flex-grow overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          emptyStateComponent
        ) : (
          messages.map((message) => {
            if (message.role === 'assistant' && showSteps && message.content.startsWith('{')) {
              try {
                JSON.parse(message.content);
                return <IntermediateStep key={message.id} message={message} />;
              } catch {
                // If JSON parse fails, render as normal message
                return (
                  <ChatMessageBubble 
                    key={message.id} 
                    message={message} 
                    aiEmoji={props.emoji}
                  />
                );
              }
            }
            return (
              <ChatMessageBubble 
                key={message.id} 
                message={message} 
                aiEmoji={props.emoji}
              />
            );
          })
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
