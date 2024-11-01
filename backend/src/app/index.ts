import { apiLogger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import { GraphState, ErrorState, DatasetSchema, ComplexityLevel, EntityType, QueryType, TrackData, UserData, PlaylistData } from "./types.js";
import { Messages } from '@langchain/langgraph'
import dotenv from 'dotenv';
import {
  extractCategoryTool,
  readUserInputTool,
  selectApiTool,
  extractParametersTool,
  createFetchRequestTool,
  getApis,
  verifyParams,
  resetState
} from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { GraphDebugger } from "./debug/graphDebugger.js";
import { apiValidators } from "./validators/apiValidators.js"; 

dotenv.config({ path: '../.env' });

// Keep existing channel definitions
const graphChannels = {
  llm: {
    value: (old: ChatOpenAI | null, next: any) => next ?? old,
    default: () => null
  },
  query: {
    value: (old: string | null, next: string) => next ?? old,
    default: () => null
  },
  queryType: {
    value: (old: QueryType | null, next: QueryType | null) => {
      console.log("\n=== QueryType Channel Update ===");
      console.log("Old:", old);
      console.log("Next:", next);
      return next ?? old;
    },
    default: () => null
  },
  categories: {
    value: (old: string[] | null, next: string[] | null) => {
      console.log("\n=== Categories Channel Update ===");
      console.log("Old:", old);
      console.log("Next:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  apis: {
    value: (old: DatasetSchema[] | null, next: DatasetSchema[] | null) => next ?? old,
    default: () => null
  },
  bestApi: {
    value: (old: DatasetSchema | null, next: DatasetSchema | null) => next ?? old,
    default: () => null
  },
  parameters: {
    value: (old: Record<string, any> | null, next: Record<string, any> | null) => next ?? old,
    default: () => null
  },
  response: {
    value: (old: { data: (TrackData | UserData | PlaylistData)[] } | null, 
           next: { data: (TrackData | UserData | PlaylistData)[] } | null) => next ?? old,
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
  selectedHost: {
    value: (old: string | null, next: string | null) => next ?? old,
    default: () => null
  },
  entity: {
    value: (old: any | null, next: any | null) => next ?? old,
    default: () => null
  },
  secondaryApi: {
    value: (old: DatasetSchema | null, next: DatasetSchema | null) => next ?? old,
    default: () => null
  },
  secondaryResponse: {
    value: (old: string | null, next: string | null) => next ?? old,
    default: () => null
  },
  initialState: {
    value: (old: GraphState | null, next: GraphState | null) => next ?? old,
    default: () => null
  },
  formattedResponse: {
    value: (old: string | null, next: string | null) => next ?? old,
    default: () => null
  }
} as const;


export function createGraph() {
  const graphDebugger = new GraphDebugger();
  
  const graph = new StateGraph<GraphState>({
    channels: graphChannels
  });

  // Define nodes with explicit tool execution
  return graph
    .addNode("extract_category_node", extractCategoryTool)
    .addNode("get_apis_node", getApis)
    .addNode("select_api_node", selectApiTool)
    .addNode("extract_params_node", extractParametersTool)
    .addNode("execute_request_node", createFetchRequestTool)
    .addNode("reset_state_node", resetState)
    
    // Define explicit edges
    .addEdge("extract_category_node", "get_apis_node")
    .addEdge("get_apis_node", "select_api_node")
    .addEdge("select_api_node", "extract_params_node")
    .addEdge("extract_params_node", "execute_request_node")
    .addEdge("execute_request_node", "reset_state_node")
    .addEdge("reset_state_node", END)
    .addEdge(START, "extract_category_node")
    
    // Add conditional edges for validation
    .addConditionalEdges(
      "extract_params_node",
      async (state: GraphState) => {
        try {
          const result = await verifyParams(state);
          return result;
        } catch (error) {
          console.error("Parameter validation failed:", error);
          return END;
        }
      }
    )
    .compile();
}

/**
  * Processes each query through the graph.
  *
  * @param {string[]} queries - The user's queries.
*/
export async function main(queries: string[]): Promise<GraphState[]> {
  console.log("\n=== Starting Query Processing ===");
  console.log(`Total queries to process: ${queries.length}`);

  const llm = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.1,
  });

  const results: GraphState[] = [];

  for (const query of queries) {
    try {
      console.log(`\n=== Processing Query: "${query}" ===`);
      
      const app = createGraph();
      let finalState: GraphState | null = null;

      const stream = await app.stream({
        query,
        llm
      });

      for await (const output of stream) {
        console.log('\n=== Stream Output ===');
        finalState = output;
        
        // Keep existing logging
        if (output.bestApi) {
          console.log('Selected API:', output.bestApi.api_name);
          
          // Validate API response if we have one
          if (output.response) {
            const validator = apiValidators[output.bestApi.api_name];
            if (validator) {
              const isValid = validator.validate(output.response);
              console.log('API Response Valid:', isValid);
              if (isValid) {
                console.log('Success:', validator.successMessage(output.response));
              } else {
                console.log('Failure:', validator.failureMessage);
              }
            }
          }
        }

        if (output.error) {
          console.error('Error in processing:', output.error);
        }
      }

      if (finalState) {
        console.log('\n=== Final State ===');
        console.log('Query Type:', finalState.queryType);
        console.log('Selected API:', finalState.bestApi?.api_name);
        console.log('Response:', finalState.response ? 
          JSON.stringify(finalState.response, null, 2) : 'No response');
        
        results.push(finalState);
      } else {
        console.log('\n❌ No final state captured');
        throw new Error('No final state captured for query: ' + query);
      }

    } catch (error) {
      console.error('Process error:', {
        phase: 'execution',
        query,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  return results;
}
