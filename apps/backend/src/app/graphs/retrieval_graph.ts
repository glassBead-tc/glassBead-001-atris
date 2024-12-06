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
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { audiusDocURLs } from "../tools/retrieval/audiusDocURLs.js";

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

// Parameter validation schema
const parameterSchema = z.record(z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.undefined()
]));

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
    value: (old: Record<string, string | number | boolean | null | undefined> | null, next: Record<string, string | number | boolean | null | undefined> | null) => {
      if (next) {
        try {
          parameterSchema.parse(next);
        } catch (error) {
          console.error("Invalid parameters:", error);
          return old;
        }
      }
      return next ?? old;
    },
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
    console.log("\n=== URL Selector Input ===");
    console.log("Query:", input.query);
    
    const normalizedQuery = input.query.toLowerCase();
    const queryTerms = normalizedQuery.split(/\W+/).filter(term => term.length > 2);
    
    // Get all doc URLs
    const allDocs = audiusDocURLs;
    
    // Score each doc URL based on multiple factors
    const scoredUrls = allDocs.map(doc => {
      let score = 0;
      
      // 1. Technical term matching
      const technicalTerms = {
        'protocol': 3,
        'sdk': 3,
        'api': 3,
        'implementation': 2,
        'architecture': 2,
        'network': 2,
        'node': 2,
        'token': 2
      };
      
      for (const [term, boost] of Object.entries(technicalTerms)) {
        if (normalizedQuery.includes(term)) {
          if (doc.path.includes(term) || doc.title.toLowerCase().includes(term)) {
            score += boost;
          }
        }
      }
      
      // 2. Category matching
      const categoryBoosts: Record<string, number> = {
        'api': 2,
        'sdk': 2,
        'protocol': 2,
        'general': 1
      };
      score += categoryBoosts[doc.category] || 1;
      
      // 3. Content relevance - check title and description
      const titleTerms = doc.title.toLowerCase().split(/\W+/);
      const descTerms = doc.description.toLowerCase().split(/\W+/);
      for (const term of queryTerms) {
        if (titleTerms.includes(term)) score += 2;
        if (descTerms.includes(term)) score += 1;
      }
      
      return {
        url: `https://docs.audius.org${doc.path}`,
        score
      };
    });
    
    // Sort by score and take top results
    const sortedUrls = scoredUrls
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0)
      .map(item => item.url);
    
    // Add default docs if no matches
    if (sortedUrls.length === 0) {
      sortedUrls.push('https://docs.audius.org/learn/concepts/protocol');
      sortedUrls.push('https://docs.audius.org/sdk');
    }
    
    console.log("Selected URLs:", sortedUrls);
    return { urls: sortedUrls };
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
    try {
      console.log("\n=== Generator Input ===");
      console.log("Query:", input.query);
      console.log("Number of docs:", input.docs.length);

      if (input.docs.length === 0) {
        return { 
          response: "I apologize, but I couldn't find any relevant documentation to answer your question." 
        };
      }

      // Create a new LLM instance for response generation
      const llm = new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0.1,
      });

      // Combine document content
      const context = input.docs
        .map(doc => doc.pageContent)
        .join("\n\n");

      const systemPrompt = `You are a helpful assistant that answers questions about the Audius SDK.
Your task: Answer the query using ONLY the provided documentation context.
If the context doesn't contain relevant information, respond with "I apologize, but I couldn't find that information in the documentation."
Format your response in a clear, direct manner.

Documentation context:
${context}`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(input.query)
      ];

      const response = await llm.invoke(messages);

      // Convert MessageContent to string
      const responseText = typeof response.content === 'string' 
        ? response.content 
        : response.content.map(part => {
            if (typeof part === 'string') return part;
            if ('type' in part && part.type === 'text') return part.text;
            if ('type' in part && part.type === 'image_url') return '[Image]';
            return '';
          }).join('');

      console.log("Generated response length:", responseText.length);
      
      return { response: responseText };

    } catch (error) {
      console.error("Error in generator:", error);
      return { 
        response: "I apologize, but I encountered an error while generating a response to your question." 
      };
    }
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
      if (!state.urls || state.urls.length === 0) {
        return { 
          relevantDocs: [],
          response: "No relevant documentation URLs found.",
          formattedResponse: "No relevant documentation URLs found."
        };
      }
      
      const result = await retrieverTool.invoke({ urls: state.urls });
      
      if (!result.docs || result.docs.length === 0) {
        return { 
          relevantDocs: [],
          response: "No relevant content found in the documentation.",
          formattedResponse: "No relevant content found in the documentation."
        };
      }
      
      return { relevantDocs: result.docs };
    })
    .addNode("grader", async (state: RetrievalState) => {
      if (!state.query) {
        throw new Error("Query is required for grading");
      }
      
      // If no docs, return grade 0 to trigger fallback
      if (!state.relevantDocs || state.relevantDocs.length === 0) {
        return { grade: 0 };
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
      
      // If no relevant docs and fallback wasn't used, return error
      if (state.relevantDocs.length === 0 && !state.fallbackUsed) {
        return { 
          response: "I apologize, but I couldn't find any relevant documentation to answer your question.",
          formattedResponse: "I apologize, but I couldn't find any relevant documentation to answer your question."
        };
      }
      
      const result = await generatorTool.invoke({ 
        docs: state.relevantDocs,
        query: state.query
      });
      
      return { 
        response: result.response,
        formattedResponse: result.response // For retrieval, these are the same
      };
    })
    .addNode("fallback", async (state: RetrievalState) => {
      if (!state.query) {
        throw new Error("Query is required for fallback search");
      }
      const result = await fallbackTool.invoke({ query: state.query });
      return { 
        relevantDocs: result.docs,
        fallbackUsed: true,
        response: result.response,
        formattedResponse: result.response
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
