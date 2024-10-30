import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from "../types.js";

export interface ToolContract<Input extends z.ZodRawShape, Output> {
  name: string;
  inputSchema: z.ZodObject<Input>;
  outputSchema: z.ZodType<Output>;
  requiredState: (keyof GraphState)[];
  modifiedState: (keyof GraphState)[];
  sideEffects?: string[];
}

export function createValidatedTool<
  Input extends z.ZodRawShape,
  Output,
  Schema extends z.ZodObject<Input>
>(
  contract: ToolContract<Input, Output>,
  implementation: (input: z.infer<Schema>) => Promise<Output>
) {
  const strictInputSchema = contract.inputSchema.strict() as Schema;
  
  return tool(
    implementation,
    {
      name: contract.name,
      description: `Validated tool for ${contract.name}`,
      schema: strictInputSchema
    }
  );
} 