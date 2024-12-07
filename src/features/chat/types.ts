export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  message: string
  domain?: 'content' | 'technical' | 'business'
  agentContent?: string
}

export interface StreamChunk {
  content: string
  done: boolean
  domain?: 'content' | 'technical' | 'business'
  agentContent?: string
  error?: string
}
