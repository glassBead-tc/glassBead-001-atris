import { ChatOpenAI } from "@langchain/openai";
import { getServerConfig } from "../env";
import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { sanitizeChatInput, sanitizeAgentInput, logSanitization } from "./sanitization";
import { StreamChunk, Message } from "@/features/chat/types";

export type ComplexityLevel = "simple" | "medium" | "complex";
export type AudiusDomain = "content" | "technical" | "business" | "other";

interface ModelConfig {
  modelName: string;
  temperature: number;
  maxTokens?: number;
}

const MODEL_CONFIGS: Record<ComplexityLevel, ModelConfig> = {
  simple: {
    modelName: "mistral/mistral-7b-instruct",
    temperature: 0.7,
    maxTokens: 1024
  },
  medium: {
    modelName: "anthropic/claude-instant-v1",
    temperature: 0.7,
    maxTokens: 2048
  },
  complex: {
    modelName: "openai/gpt-4",
    temperature: 0.7,
    maxTokens: 4096
  }
};

const SYSTEM_PROMPT = `You are a helpful assistant specifically focused on Audius-related queries. 
Your role is to route queries to the appropriate system:

1. CONTENT Queries - Mark with [USING_AGENT_API]:
   - Questions about specific users, tracks, or playlists
   - Requests for trending or popular content
   - Searches for specific music or artists
   Example: "Show me trending tracks" -> "[USING_AGENT_API] Let me fetch the trending tracks..."

2. TECHNICAL Queries - Mark with [USING_AGENT_DOCS]:
   - Questions about Audius's technical architecture
   - Protocol documentation queries
   - Technical implementation details
   Example: "How does Audius handle content addressing?" -> "[USING_AGENT_DOCS] Let me search the technical documentation..."

3. BUSINESS Queries - Mark with [USING_WEB_SEARCH]:
   - Questions about the company
   - Investment or token information
   - General business strategy
   Example: "What is Audius's business model?" -> "[USING_WEB_SEARCH] Let me search for information about Audius's business model..."

For other queries, respond directly without any special marking.
Always provide clear, concise responses and ask for clarification if needed.`;

export class AgentChatbot {
  private models: Record<ComplexityLevel, ChatOpenAI>;
  domain: AudiusDomain = "other";
  complexity: ComplexityLevel = "simple";

  constructor() {
    const config = getServerConfig();
    
    this.models = Object.entries(MODEL_CONFIGS).reduce((acc, [level, modelConfig]) => ({
      ...acc,
      [level]: new ChatOpenAI({
        modelName: modelConfig.modelName,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        streaming: true,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: config.OPENROUTER_API_KEY,
        }
      })
    }), {} as Record<ComplexityLevel, ChatOpenAI>);
  }

  async classifyQuery(message: string): Promise<{
    domain: AudiusDomain;
    complexity: ComplexityLevel;
  }> {
    const sanitizedInput = sanitizeAgentInput(message);
    logSanitization(message, sanitizedInput);

    // Simple heuristic for now - can be expanded later
    if (message.toLowerCase().includes("track") || 
        message.toLowerCase().includes("playlist") ||
        message.toLowerCase().includes("artist")) {
      return { domain: "content", complexity: "simple" };
    }

    if (message.toLowerCase().includes("protocol") ||
        message.toLowerCase().includes("technical") ||
        message.toLowerCase().includes("documentation")) {
      return { domain: "technical", complexity: "medium" };
    }

    if (message.toLowerCase().includes("business") ||
        message.toLowerCase().includes("company") ||
        message.toLowerCase().includes("token")) {
      return { domain: "business", complexity: "complex" };
    }

    return { domain: "other", complexity: "simple" };
  }

  private messagesToLangChain(messages: Message[]): BaseMessage[] {
    return [
      new SystemMessage(SYSTEM_PROMPT),
      ...messages.map(msg => 
        msg.role === 'user' 
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      )
    ];
  }

  async chat(messages: Message[]): Promise<string> {
    try {
      const lastMessage = messages[messages.length - 1];
      const { domain, complexity } = await this.classifyQuery(lastMessage.content);
      this.domain = domain;
      this.complexity = complexity;

      const processedMessages = this.messagesToLangChain(messages);
      const response = await this.models[this.complexity].invoke(processedMessages);
      return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (error) {
      console.error('Error in chat:', error);
      return 'I encountered an error processing your message. Please try again.';
    }
  }

  async *chatStream(messages: Message[]): AsyncGenerator<StreamChunk> {
    try {
      const lastMessage = messages[messages.length - 1];
      const { domain, complexity } = await this.classifyQuery(lastMessage.content);
      this.domain = domain;
      this.complexity = complexity;

      const processedMessages = this.messagesToLangChain(messages);
      const stream = await this.models[this.complexity].stream(processedMessages);

      for await (const chunk of stream) {
        yield {
          content: typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content),
          done: false,
          domain: this.domain === 'other' ? undefined : this.domain,
        };
      }

      yield {
        content: '',
        done: true,
        domain: this.domain === 'other' ? undefined : this.domain,
      };
    } catch (error) {
      console.error('Error in chatStream:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      yield {
        content: '',
        done: true,
        error: errorMessage,
      };
    }
  }
}