import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      "flex w-full mb-4 animate-fade-in",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2",
        isUser ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900",
        message.status === 'sending' && "opacity-70",
        message.status === 'error' && "bg-red-100 text-red-900"
      )}>
        <div className="prose prose-sm">
          <p className="whitespace-pre-wrap mb-1">{message.content}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs opacity-70">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.status === 'sending' && (
            <span className="text-xs">sending...</span>
          )}
          {message.status === 'error' && (
            <span className="text-xs text-red-500">error sending</span>
          )}
        </div>
      </div>
    </div>
  );
}
