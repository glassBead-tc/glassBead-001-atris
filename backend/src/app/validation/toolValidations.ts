import { z } from "zod";
import { ToolValidation } from "./index.js";
import { GraphState } from "../types.js";

// Validation for extractCategoryTool
export const extractCategoryValidation: ToolValidation<
  { query: string; llm: any },
  Partial<GraphState>
> = {
  name: "extract_category",
  input: z.object({
    query: z.string(),
    llm: z.any()
  }),
  output: z.object({
    queryType: z.enum(["general", "trending_tracks"]),
    entityType: z.enum(["track", "user", "playlist"]).nullable(),
    isEntityQuery: z.boolean(),
    complexity: z.enum(["simple", "moderate", "complex"])
  }),
  stateUpdates: ["queryType", "entityType", "isEntityQuery", "complexity"],
  dependencies: ["query", "llm"],
  llmUsage: {
    inputFormat: "System: You are analyzing a query...\nHuman: {query}",
    outputFormat: `{
      "queryType": "general" | "trending_tracks",
      "entityType": "track" | "user" | "playlist" | null,
      "complexity": "simple" | "moderate" | "complex"
    }`,
    validation: z.object({
      queryType: z.enum(["general", "trending_tracks"]),
      entityType: z.enum(["track", "user", "playlist"]).nullable(),
      complexity: z.enum(["simple", "moderate", "complex"])
    })
  }
}; 