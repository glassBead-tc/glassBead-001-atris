import { z } from "zod";
import { GraphState } from "../types.js";

// Define a single source of truth for state shape
export const BaseStateSchema = z.object({
  query: z.string().nullable(),
  llm: z.any(),  // Will be ChatOpenAI but needs special handling
  queryType: z.enum(["general", "trending_tracks"]).nullable(),
  // ... other fields
}).strict();

// Validate state transitions between components
export function validateStateTransition(
  from: string,
  to: string,
  prevState: Partial<GraphState>,
  nextState: Partial<GraphState>
) {
  const allowedTransitions = {
    "extract_category_node": ["get_apis_node"],
    "get_apis_node": ["select_api_node"],
    // ... define all valid transitions
  };

  if (!allowedTransitions[from]?.includes(to)) {
    throw new Error(`Invalid transition from ${from} to ${to}`);
  }

  // Check that required fields are present for this transition
  const requiredFields = transitionRequirements[`${from}->${to}`];
  // ...
} 