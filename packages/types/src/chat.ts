import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { Message as VercelMessage } from 'ai';

/**
 * Tool invocation state
 */
export type ToolInvocationState = 'running' | 'success' | 'error';

/**
 * Base tool call interface
 */
export interface ToolCall<Name extends string = string, Args = any> {
  toolCallId: string;
  toolName: Name;
  args: Args;
}

/**
 * Tool result interface
 */
export interface ToolResult<Name extends string = string, Args = any, Output = any> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  output?: Output;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Tool invocation type that represents either a call in progress or a completed result
 */
export type ToolInvocation = 
  | ({ state: 'partial-call' } & ToolCall)
  | ({ state: 'call' } & ToolCall)
  | ({ state: 'result' } & ToolResult);

/**
 * Base message interface that all chat messages must implement
 */
export interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}

/**
 * Message metadata interface
 */
export interface MessageMetadata {
  confidence?: number;
  sources?: string[];
  thinking_steps?: string[];
  annotations?: any[];
  data?: any;
}

/**
 * Extended message interface with agent-specific features
 */
export interface AgentMessage extends BaseMessage {
  toolInvocations?: ToolInvocation[];
  metadata?: MessageMetadata;
}

/**
 * Chat session metadata
 */
export interface ChatMetadata {
  sessionId?: string;
  lastUpdateTime?: number;
  context?: Record<string, any>;
}

/**
 * Chat state interface extending the base graph state
 */
export interface ChatState {
  currentMessage: AgentMessage | null;
  messageHistory: AgentMessage[];
  pendingInvocations: ToolInvocation[];
  metadata: ChatMetadata;
}

/**
 * Message format converters
 */
export const messageConverters = {
  /**
   * Convert to Vercel AI format
   */
  toVercelMessage: (msg: AgentMessage): VercelMessage => ({
    id: msg.id,
    role: msg.role as VercelMessage['role'],
    content: msg.content,
    createdAt: msg.createdAt,
    ...(Array.isArray(msg.toolInvocations) && msg.toolInvocations.length > 0 && {
      toolInvocations: msg.toolInvocations
    }),
    ...(msg.metadata?.annotations && { annotations: msg.metadata.annotations }),
    ...(msg.metadata?.data && { data: msg.metadata.data })
  }),

  /**
   * Convert to LangChain format
   */
  toLangChainMessage: (msg: AgentMessage): HumanMessage | SystemMessage | AIMessage => {
    const baseContent = msg.content;
    switch (msg.role) {
      case 'user':
        return new HumanMessage(baseContent);
      case 'system':
        return new SystemMessage(baseContent);
      case 'assistant':
        return new AIMessage(baseContent);
      default:
        throw new Error(`Unknown message role: ${msg.role}`);
    }
  },

  /**
   * Convert from Vercel AI format
   */
  fromVercelMessage: (msg: VercelMessage): AgentMessage => ({
    id: msg.id,
    role: msg.role as AgentMessage['role'],
    content: msg.content,
    createdAt: msg.createdAt,
    ...(Array.isArray(msg.toolInvocations) && msg.toolInvocations.length > 0 && {
      toolInvocations: msg.toolInvocations
    }),
    metadata: {
      ...(msg.annotations && { annotations: msg.annotations }),
      ...(msg.data && { data: msg.data })
    }
  }),

  /**
   * Convert from LangChain format
   */
  fromLangChainMessage: (msg: HumanMessage | SystemMessage | AIMessage): AgentMessage => ({
    id: Math.random().toString(36).substring(7), // LangChain messages don't have IDs
    role: msg._getType() as AgentMessage['role'],
    content: msg.content as string,
    createdAt: new Date()
  })
};

/**
 * Helper functions for working with messages
 */
export const messageHelpers = {
  /**
   * Create a new user message
   */
  createUserMessage: (content: string): AgentMessage => ({
    id: Math.random().toString(36).substring(7),
    role: 'user',
    content,
    createdAt: new Date()
  }),

  /**
   * Create a new system message
   */
  createSystemMessage: (content: string): AgentMessage => ({
    id: Math.random().toString(36).substring(7),
    role: 'system',
    content,
    createdAt: new Date()
  }),

  /**
   * Create a new assistant message
   */
  createAssistantMessage: (content: string, metadata?: MessageMetadata): AgentMessage => ({
    id: Math.random().toString(36).substring(7),
    role: 'assistant',
    content,
    createdAt: new Date(),
    metadata
  }),

  /**
   * Create a new tool invocation
   */
  createToolInvocation: (toolName: string, args: Record<string, any>): ToolInvocation => ({
    state: 'partial-call',
    toolCallId: Math.random().toString(36).substring(7),
    toolName,
    args
  }),

  /**
   * Add a tool invocation to a message
   */
  addToolInvocation: (message: AgentMessage, invocation: ToolInvocation): AgentMessage => ({
    ...message,
    toolInvocations: [
      ...(message.toolInvocations || []),
      invocation
    ]
  }),

  /**
   * Update a tool invocation's state and result
   */
  updateToolInvocation: (
    message: AgentMessage,
    toolCallId: string,
    update: { state: 'result', output?: any } | { state: 'call' } | { state: 'partial-call' }
  ): AgentMessage => ({
    ...message,
    toolInvocations: message.toolInvocations?.map(invocation =>
      invocation.toolCallId === toolCallId
        ? { ...invocation, ...update }
        : invocation
    ) || []
  })
};
