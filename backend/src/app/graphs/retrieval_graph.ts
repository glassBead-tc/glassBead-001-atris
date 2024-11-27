import { StateGraph, START, END } from "@langchain/langgraph";
import { Document } from "langchain/document";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { LangGraphRunnableConfig, StateType } from "@langchain/langgraph";
import { 
  GraphState, 
  ApiEndpoint, 
  QueryType, 
  ComplexityLevel, 
  EntityType, 
  ErrorState,
  ApiResponse
} from '../types.js';
import { MinimalAudiusSDK } from '../services/sdkClient.js';
import { ChatOpenAI } from "@langchain/openai";
import { Messages } from '@langchain/langgraph';

// Base state definition extending GraphState
interface StateDefinition extends GraphState {
  // No additional base properties needed
}

// Retrieval-specific state extending base state
interface RetrievalState extends StateDefinition {
  // Retrieval-specific properties
  urls: string[];
  relevantDocs: Document[];
  grade: number;
  fallbackUsed: boolean;
  retrievalResponse: string; // Renamed to avoid conflict with base response
}

// Define channels explicitly, including all parent state channels
const retrievalChannels = {
  // Base GraphState channels
  llm: {
    value: (old: ChatOpenAI | null, next: ChatOpenAI | null) => next ?? old,
    default: () => null
  },
  query: {
    value: (old: string | null, next: string) => next ?? old ?? "",
    default: () => ""
  },
  queryType: {
    value: (old: QueryType | null, next: QueryType | null) => next ?? old,
    default: () => null
  },
  categories: {
    value: (old: string[] | null, next: string[] | null) => next ?? old,
    default: () => null
  },
  apis: {
    value: (old: ApiEndpoint[] | null, next: ApiEndpoint[] | null) => next ?? old,
    default: () => null
  },
  bestApi: {
    value: (old: ApiEndpoint | null, next: ApiEndpoint | null) => next ?? old,
    default: () => null
  },
  parameters: {
    value: (old: Record<string, any> | null, next: Record<string, any> | null) => next ?? old,
    default: () => null
  },
  response: {
    value: (old: ApiResponse | null, next: ApiResponse | null) => next ?? old,
    default: () => null
  },
  formattedResponse: {
    value: (old: string | null, next: string | null) => next ?? old,
    default: () => null
  },
  complexity: {
    value: (old: ComplexityLevel | null, next: ComplexityLevel | null) => next ?? old,
    default: () => null
  },
  isEntityQuery: {
    value: (old: boolean | null, next: boolean | null) => next ?? old,
    default: () => null
  },
  entityName: {
    value: (old: string | null, next: string | null) => next ?? old,
    default: () => null
  },
  entityType: {
    value: (old: EntityType | null, next: EntityType | null) => next ?? old,
    default: () => null
  },
  error: {
    value: (old: ErrorState | null, next: ErrorState | null) => next ?? old,
    default: () => null
  },
  errorHistory: {
    value: (old: ErrorState[], next: ErrorState) => [...(old || []), next],
    default: () => []
  },
  messages: {
    value: (old: Messages | null, next: Messages | null) => next ?? old,
    default: () => null
  },
  messageHistory: {
    value: (old: Messages[], next: Messages) => [...(old || []), next],
    default: () => []
  },
  secondaryApi: {
    value: (old: ApiEndpoint | null, next: ApiEndpoint | null) => next ?? old,
    default: () => null
  },
  secondaryResponse: {
    value: (old: string | null, next: string | null) => next ?? old,
    default: () => null
  },
  sdk: {
    value: (old: MinimalAudiusSDK | null, next: MinimalAudiusSDK | null) => next ?? old,
    default: () => null
  },
  initialized: {
    value: (old: boolean | null, next: boolean | null) => next ?? old,
    default: () => null
  },
  sdkInitialized: {
    value: (old: boolean | null, next: boolean | null) => next ?? old,
    default: () => null
  },
  sdkConfig: {
    value: (old: any, next: any) => ({
      ...old,
      ...next,
    }),
    default: () => ({
      apiKey: null,
      baseUrl: null,
      initialized: null
    })
  },

  // Retrieval-specific channels
  urls: {
    value: (old: string[] | null, next: string[]) => next ?? old ?? [],
    default: () => []
  },
  relevantDocs: {
    value: (old: Document[] | null, next: Document[]) => next ?? old ?? [],
    default: () => []
  },
  grade: {
    value: (old: number | null, next: number) => next ?? old ?? 0,
    default: () => 0
  },
  fallbackUsed: {
    value: (old: boolean | null, next: boolean) => next ?? old ?? false,
    default: () => false
  },
  retrievalResponse: {
    value: (old: string | null, next: string) => next ?? old ?? "",
    default: () => ""
  }
} as const;

// URL selector tool
export const urlSelectorTool = tool(
  async (input: { query: string }): Promise<{ urls: string[] }> => {
    // TODO: Implement embedding-based URL selection
    return { urls: [] };
  },
  {
    name: "url_selector",
    description: "Selects relevant documentation URLs based on query",
    schema: z.object({
      query: z.string().describe("The user's query")
    })
  }
);

// Retriever tool
export const retrieverTool = tool(
  async (input: { urls: string[] }): Promise<{ docs: Document[] }> => {
    // TODO: Implement content retrieval
    return { docs: [] };
  },
  {
    name: "retriever",
    description: "Retrieves content from documentation URLs",
    schema: z.object({
      urls: z.array(z.string()).describe("List of documentation URLs to retrieve")
    })
  }
);

// Grader tool
export const graderTool = tool(
  async (input: { docs: Document[], query: string }): Promise<{ grade: number }> => {
    // TODO: Implement LLM-based content grading
    return { grade: 0 };
  },
  {
    name: "grader",
    description: "Grades retrieved content for relevance",
    schema: z.object({
      docs: z.array(z.any()).describe("Retrieved documents to grade"),
      query: z.string().describe("Original query for context")
    })
  }
);

// Generator tool
export const generatorTool = tool(
  async (input: { docs: Document[], query: string }): Promise<{ response: string }> => {
    // TODO: Implement LLM-based response generation
    return { response: "" };
  },
  {
    name: "generator",
    description: "Generates user-friendly response from relevant documents",
    schema: z.object({
      docs: z.array(z.any()).describe("Relevant documents to use"),
      query: z.string().describe("Original query for context")
    })
  }
);

// Fallback tool
export const fallbackTool = tool(
  async (input: { query: string }): Promise<{ docs: Document[] }> => {
    // TODO: Implement Tavily fallback search
    return { docs: [] };
  },
  {
    name: "fallback",
    description: "Fallback search using Tavily when no relevant docs found",
    schema: z.object({
      query: z.string().describe("Query to search with Tavily")
    })
  }
);

// Create and export the retrieval graph
export function createRetrievalGraph() {
  const workflow = new StateGraph<RetrievalState>({
    channels: retrievalChannels
  });

  // Define nodes
  workflow
    .addNode("url_selector", async (state: RetrievalState) => {
      if (!state.query) {
        throw new Error("Query is required for URL selection");
      }
      const result = await urlSelectorTool.invoke({ query: state.query });
      return { urls: result.urls };
    })
    .addNode("retriever", async (state: RetrievalState) => {
      const result = await retrieverTool.invoke({ urls: state.urls });
      return { relevantDocs: result.docs };
    })
    .addNode("grader", async (state: RetrievalState) => {
      if (!state.query) {
        throw new Error("Query is required for grading");
      }
      const result = await graderTool.invoke({ 
        docs: state.relevantDocs,
        query: state.query 
      });
      return { grade: result.grade };
    })
    .addNode("generator", async (state: RetrievalState) => {
      if (!state.query) {
        throw new Error("Query is required for response generation");
      }
      const result = await generatorTool.invoke({ 
        docs: state.relevantDocs,
        query: state.query
      });
      return { retrievalResponse: result.response };
    })
    .addNode("fallback", async (state: RetrievalState) => {
      if (!state.query) {
        throw new Error("Query is required for fallback search");
      }
      const result = await fallbackTool.invoke({ query: state.query });
      return { 
        relevantDocs: result.docs,
        fallbackUsed: true
      };
    })

    // Define edges with corrected method and typed conditions
    .addEdge(START, "url_selector")
    .addEdge("url_selector", "retriever")
    .addEdge("retriever", "grader")
    .addConditionalEdges(
      "grader",
      async (state: RetrievalState, config: any) => {
        if (state.grade === 0) {
          return "fallback";
        }
        return "generator";
      }
    )
    .addEdge("fallback", "generator")
    .addEdge("generator", END);

  // Compile and return the workflow
  return workflow.compile();
}
