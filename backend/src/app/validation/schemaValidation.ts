import { z } from "zod";
import { GraphState } from "../types.js";

// Define a single source of truth for state shape
export const BaseStateSchema = z.object({
  query: z.string().nullable(),
  llm: z.any(),  // Will be ChatOpenAI but needs special handling
  queryType: z.enum(["general", "trending_tracks"]).nullable(),
  // ... other fields
}).strict();

type NodeName =
  | '__start__'
  | '__end__'
  | 'extract_category_node' 
  | 'get_apis_node' 
  | 'select_api_node' 
  | 'extract_params_node'
  | 'execute_request_node'
  | 'reset_state_node';

// Define valid transitions first
const allowedTransitions: Record<NodeName, NodeName[]> = {
  '__start__': ['extract_category_node'],
  'extract_category_node': ['get_apis_node'],
  'get_apis_node': ['select_api_node'],
  'select_api_node': ['extract_params_node'],
  'extract_params_node': ['execute_request_node'],
  'execute_request_node': ['reset_state_node'],
  'reset_state_node': ['__end__'],
  '__end__': []
};

// Then define requirements only for valid transitions
const transitionRequirements: Record<string, (keyof GraphState)[]> = {
  // Only define requirements for transitions that exist in allowedTransitions
  '__start__->extract_category_node': ['query', 'llm'],
  'extract_category_node->get_apis_node': ['queryType', 'entityType', 'categories'],
  'get_apis_node->select_api_node': ['apis'],
  'select_api_node->extract_params_node': ['bestApi'],
  'extract_params_node->execute_request_node': ['parameters'],
  'execute_request_node->reset_state_node': ['response'],
  'reset_state_node->__end__': []
};

// Validate transitions using allowedTransitions
export function validateStateTransition(
  from: NodeName,
  to: NodeName,
  prevState: Partial<GraphState>,
  nextState: Partial<GraphState>
) {
  // First check if transition is allowed
  if (!allowedTransitions[from]?.includes(to)) {
    throw new Error(`Invalid transition from ${from} to ${to}`);
  }

  // Then check required state fields
  const transitionKey = `${from}->${to}`;
  const requiredFields = transitionRequirements[transitionKey];
  
  if (!requiredFields) {
    throw new Error(`No requirements defined for transition ${transitionKey}`);
  }

  for (const field of requiredFields) {
    if (nextState[field] === undefined) {
      throw new Error(`Missing required field ${String(field)} for transition ${from}->${to}`);
    }
  }
} 