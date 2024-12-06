import { GraphState } from '../../../backend/src/app/types';
import { main } from '../../../backend/src/app';

export interface AgentResponse {
  state: GraphState;
  error?: string;
}

export async function queryAgent(query: string): Promise<AgentResponse> {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  const data = await response.json();
  return data;
}

export { main }; 