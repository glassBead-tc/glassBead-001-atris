export interface GraphState {
    // Move relevant types from backend/src/app/types.ts
}

export interface AgentResponse {
    state: GraphState;
    error?: string;
}
