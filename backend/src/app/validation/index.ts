import { z } from "zod";
import { GraphState } from "../types.js";
import { ChatOpenAI } from "@langchain/openai";

// 1. Tool Input/Output Validation
export interface ToolValidation<Input, Output> {
  name: string;
  input: z.ZodSchema<Input>;
  output: z.ZodSchema<Output>;
  stateUpdates: (keyof GraphState)[];  // Which state fields this tool modifies
  dependencies: (keyof GraphState)[];   // Which state fields this tool requires
  llmUsage?: {                         // If tool uses LLM
    inputFormat: string;               // Expected LLM input format
    outputFormat: string;              // Expected LLM output format
    validation: z.ZodSchema;           // Validate LLM response
  };
}

// 2. State Transition Validation
export function validateStateTransition(
  prevState: GraphState,
  nextState: GraphState,
  tool: string,
  toolValidation: ToolValidation<any, any>
): void {
  // Verify required fields exist
  for (const dep of toolValidation.dependencies) {
    if (prevState[dep] === undefined) {
      throw new Error(
        `Tool ${tool} requires ${String(dep)} but it was not present in state`
      );
    }
  }

  // Verify only allowed fields were modified
  for (const key of Object.keys(nextState) as (keyof GraphState)[]) {
    if (
      prevState[key] !== nextState[key] && 
      !toolValidation.stateUpdates.includes(key)
    ) {
      throw new Error(
        `Tool ${tool} modified ${String(key)} but is not allowed to`
      );
    }
  }
}

// 3. LLM Response Validation
export function validateLLMResponse<T>(
  response: unknown,
  schema: z.ZodSchema<T>,
  context: string
): T {
  try {
    return schema.parse(response);
  } catch (error) {
    throw new Error(
      `Invalid LLM response in ${context}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
} 