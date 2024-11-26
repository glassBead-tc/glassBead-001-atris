import { StateGraph, START, END } from "@langchain/langgraph";
import { Document } from "langchain/document";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { LangGraphRunnableConfig, StateType } from "@langchain/langgraph";

// Extending StateDefinition to include RetrievalState properties
interface StateDefinition {
  // ... other parent state properties
}

interface RetrievalState extends StateDefinition {
  query: string;
  urls: string[];
  relevantDocs: Document[];
  grade: number;
  response: string;
  fallbackUsed: boolean;
}

// Define channels explicitly
const retrievalChannels = {
  query: {
    value: (old: string | null, next: string) => next ?? old ?? "",
    default: () => ""
  },
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
  response: {
    value: (old: string | null, next: string) => next ?? old ?? "",
    default: () => ""
  },
  fallbackUsed: {
    value: (old: boolean | null, next: boolean) => next ?? old ?? false,
    default: () => false
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
      const result = await urlSelectorTool.invoke({ query: state.query });
      return { urls: result.urls };
    })
    .addNode("retriever", async (state: RetrievalState) => {
      const result = await retrieverTool.invoke({ urls: state.urls });
      return { relevantDocs: result.docs };
    })
    .addNode("grader", async (state: RetrievalState) => {
      const result = await graderTool.invoke({ 
        docs: state.relevantDocs,
        query: state.query 
      });
      return { grade: result.grade };
    })
    .addNode("generator", async (state: RetrievalState) => {
      const result = await generatorTool.invoke({ 
        docs: state.relevantDocs,
        query: state.query
      });
      return { response: result.response };
    })
    .addNode("fallback", async (state: RetrievalState) => {
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
