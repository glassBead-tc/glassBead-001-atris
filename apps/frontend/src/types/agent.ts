export interface AgentRequest {
  content: string;
  threadId: string;
}

export interface AgentResponse {
  response: string;
  intermediateSteps?: {
    thought: string;
    action?: string;
    observation?: string;
  }[];
  error?: string;
}

export interface StreamChunk {
  type: 'intermediate' | 'final';
  data: Partial<AgentResponse>;
}
