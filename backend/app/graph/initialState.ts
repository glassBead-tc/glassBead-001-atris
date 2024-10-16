import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "../types.js";

// Initialize the ChatOpenAI instance as per your configuration
const llmInstance = new ChatOpenAI({
  
});

export const initialGraphState: GraphState = {
  llm: llmInstance,
  query: "",
  queryType: "",
  categories: [],
  apis: [],
  bestApi: null,
  params: {},
  response: null,
  error: false, // Default to no error
  message: null,
  entity: null,
  complexity: "simple",
  entityType: null,
};