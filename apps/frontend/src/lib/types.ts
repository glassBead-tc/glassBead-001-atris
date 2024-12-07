export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  threadId: string;
  status: 'sending' | 'sent' | 'error';
}

export interface Thread {
  id: string;
  title: string;
  lastMessageTimestamp: number;
  messages: Message[];
}

export interface ChatState {
  threads: Record<string, Thread>;
  activeThreadId: string | null;
  isProcessing: boolean;
  error: string | null;
}
