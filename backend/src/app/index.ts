import { ChatOpenAI } from "@langchain/openai";
import { GraphState, ErrorState, DatasetSchema, ComplexityLevel, EntityType, QueryType } from "./types.js";
import { Messages } from '@langchain/langgraph'
import dotenv from 'dotenv';
import {
  extractCategoryTool,
  selectApiTool,
  extractParametersTool,
  createFetchRequestTool,
  verifyParams,
  resetState,
  initSdkTool,
  formatResponseTool
} from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import type { 
  TracksResponse,
  UsersResponse,
  TrackResponse,
  UserResponse,
  PlaylistResponse,
  TrackCommentsResponse,
  StemsResponse,
  Reposts,
  FavoritesResponse
} from '@audius/sdk';
import { getAudiusSdk } from './sdkClient.js';

type ApiResponse = 
  | TracksResponse 
  | UsersResponse 
  | TrackResponse 
  | UserResponse 
  | PlaylistResponse
  | TrackCommentsResponse
  | StemsResponse
  | Reposts
  | FavoritesResponse;

dotenv.config();

// Debug logging for environment variables
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
console.log('AUDIUS_API_KEY:', process.env.AUDIUS_API_KEY ? 'Set' : 'Not set');

// Keep existing channel definitions
const graphChannels = {
  llm: {
    value: (old: ChatOpenAI | null, next: any) => next ?? old,
    default: () => null
  },
  query: {
    value: (old: string | null, next: any) => next ?? old,
    default: () => null
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
    value: (old: ApiResponse | null, next: ApiResponse | null) => next ?? old,
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
  },
  initialized: {
    value: (old: boolean | undefined, next: boolean | undefined) => next ?? old,
    default: () => false
  }
} as const;

const audiusSdk = await getAudiusSdk();
console.log("SDK initialized successfully");

export function createGraph() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels
  });

  return graph
    .addNode("init_sdk_node", async (state: GraphState) => {
      console.log("\n=== Init SDK Node Start ===");
      try {
        const result = await initSdkTool.invoke({});
        console.log("Init SDK Tool Result:", result);
        return result;
      } catch (error) {
        console.error("Error in init_sdk_node:", error);
        throw error;
      }
    })
    .addNode("extract_category_node", async (state: GraphState) => {
      console.log("\n=== Extract Category Node Start ===");
      console.log("Input State:", state);
      
      try {
        if (!state.query) {
          throw new Error("Extract category received null query");
        }
        
        const result = await extractCategoryTool.invoke({
          query: state.query
        });
        
        console.log("Category Extraction Result:", result);
        if (!result.queryType || !result.categories) {
          throw new Error("Extract category produced invalid state");
        }
        
        console.log("=== Extract Category Node Complete ===");
        return result;
      } catch (error) {
        console.error("Error in extract_category_node:", error);
        throw error;
      }
    })
    .addNode("select_api_node", async (state: GraphState) => {
      console.log("\n=== Select API Node Start ===");
      console.log("Input State:", state);
      
      try {
        if (!state.queryType || !state.categories) {
          throw new Error("Select API received invalid state");
        }
        
        const mappedQueryType = state.queryType === 'general' 
          ? 'trending_tracks'
          : state.queryType;
        
        const result = await selectApiTool.invoke({
          categories: state.categories,
          entityType: state.entityType,
          queryType: mappedQueryType
        });
        console.log("API Selection Result:", result);
        
        if (!result.bestApi) {
          throw new Error("Select API produced invalid state");
        }
        
        console.log("=== Select API Node Complete ===");
        return {
          ...result,
          queryType: state.queryType
        };
      } catch (error) {
        console.error("Error in select_api_node:", error);
        throw error;
      }
    })
    .addNode("extract_params_node", async (state: GraphState) => {
      console.log("\n=== Extract Params Node Start ===");
      console.log("Input State:", state);
      
      try {
        if (!state.query || !state.bestApi) {
          throw new Error("Missing required state for parameter extraction");
        }

        const result = await extractParametersTool.invoke({
          query: state.query,
          entityType: state.entityType,
          bestApi: state.bestApi
        });
        console.log("Parameter Extraction Result:", result);
        
        console.log("=== Extract Params Node Complete ===");
        return result;
      } catch (error) {
        console.error("Error in extract_params_node:", error);
        throw error;
      }
    })
    .addNode("execute_request_node", async (state: GraphState) => {
      try {
        const { parameters, bestApi } = state;
        
        if (!bestApi) {
          throw new Error("No bestApi found in state");
        }

        const input = {
          parameters: parameters || {},
          bestApi: {
            api_name: bestApi.api_name
          }
        };

        const result = await createFetchRequestTool.invoke(input);
        
        return {
          ...state,
          response: result.response,
          error: null
        };
      } catch (error) {
        return {
          ...state,
          error: {
            code: 'EXECUTE_REQUEST_FAILED',
            message: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
            node: 'execute_request_node'
          }
        };
      }
    })
    .addNode("reset_state_node", async (state: GraphState) => {
      console.log("\n=== Reset State Node Start ===");
      console.log("Input State:", state);
      
      try {
        if (state.response || state.error) {
          const resetResult = await resetState.invoke({});
          console.log("Reset Result:", resetResult);
          console.log("=== Reset State Node Complete ===");
          return resetResult;
        }
        
        throw new Error("Cannot reset state without response or error");
      } catch (error) {
        console.error("Error in reset_state_node:", error);
        throw error;
      }
    })
    .addNode("format_response_node", async (state: GraphState) => {
      console.log("\n=== Format Response Node Start ===");
      try {
        if (!state.response) {
          throw new Error("No response to format");
        }

        const result = await formatResponseTool.invoke({
          response: state.response
        });
        
        return {
          ...state,
          formattedResponse: result.formattedResponse
        };
      } catch (error) {
        console.error("Error in format_response_node:", error);
        throw error;
      }
    })
    
    // Simplified edge definitions - mix of regular and conditional edges
    .addEdge(START, "init_sdk_node")
    .addConditionalEdges(
      "init_sdk_node", 
      async (state: GraphState) => {
        console.log("\n=== Init SDK Edge Check ===");
        console.log("Full state in edge:", {
          initialized: state.initialized
        });
        
        if (state.initialized) {
          console.log("SDK initialized, continuing to extract_category_node");
          return "extract_category_node";
        }
        
        console.log("SDK initialization failed, ending graph");
        return END;
      }
    )
    // Direct edge - no condition needed since extract_category_node handles its own validation
    .addEdge("extract_category_node", "select_api_node")
    // Direct edge - select_api_node handles its own validation
    .addEdge("select_api_node", "extract_params_node")
    .addConditionalEdges(
      "extract_params_node",
      async (state: GraphState) => {
        console.log("\n=== Extract Params Edge Check ===");
        try {
          const result = await verifyParams(state);
          return result;
        } catch (error) {
          console.error("Params verification failed:", error);
          return END;
        }
      }
    )
    .addConditionalEdges(
      "execute_request_node",
      async (state: GraphState) => {
        console.log("\n=== Execute Request Edge Check ===");
        return (state.response || state.error) ? "format_response_node" : END;
      }
    )
    .addEdge("format_response_node", "reset_state_node")
    // Update the reset_state_node edge to explicitly return END
    .addConditionalEdges(
      "reset_state_node",
      async (state: GraphState) => {
        console.log("\n=== Reset State Edge Check ===");
        console.log("State:", state);
        return END;  // Always end after reset
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

  const results: GraphState[] = [];
  let currentQueryIndex = 0;

  for (const query of queries) {
    currentQueryIndex++;
    console.log(`\n=== Processing Query ${currentQueryIndex}/${queries.length} ===`);
    console.log(`Query: "${query}"`);
    console.log("=".repeat(80));

    try {
      console.log("\n=== Creating Graph ===");
      const app = createGraph();
      console.log("Graph created successfully");

      console.log("\n=== Creating Stream ===");
      const stream = await app.stream({
        query,
        llm: new ChatOpenAI({
          modelName: 'gpt-3.5-turbo',
          temperature: 0.1,
        }),
        initialized: false
      });
      console.log("Stream created successfully");

      let finalState: GraphState | null = null;
      let isComplete = false;

      for await (const output of stream) {
        // Store the state before checking for END
        if (output !== END) {
          finalState = output;
        }

        if (output.formattedResponse) {
          console.log("\nFormatted Response:", output.formattedResponse);
        }
        if (output.error) {
          console.error("\nError:", output.error);
        }
        
        if (output === END) {
          isComplete = true;
          break;
        }
      }

      if (finalState) {
        console.log("\n=== Stream Completed Successfully ===");
        results.push(finalState);
      } else {
        throw new Error('Stream completed but no final state was produced');
      }

    } catch (error) {
      console.error('Process error:', {
        phase: 'execution',
        query,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace available'
      });
    }
  }

  return results;
}

if (process.env.NODE_ENV !== 'test') {
  const testQueries = [
    "What are the top 10 trending tracks on Audius?"
  ];
  
  console.log("\n=== Starting Atris Backend ===");
  console.log("Test queries:", testQueries);
  
  main(testQueries).catch(error => {
    console.error("Error in main:", error);
    process.exit(1);
  });
}
