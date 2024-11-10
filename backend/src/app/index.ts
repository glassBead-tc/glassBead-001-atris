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
  formatResponseTool,
  enhanceResponseTool
} from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { ApiEndpoint } from './types.js';
import { analyzeQuery } from "./tools/utils/queryAnalysis.js";


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
    value: (old: GraphState['response'], next: GraphState['response']) => next ?? old,
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
  formattedResponse: {
    value: (old: string | null, next: string | null) => next ?? old,
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
    value: (old: GraphState['sdkConfig'], next: GraphState['sdkConfig']) => {
      if (!next) {
        return {
          apiKey: null,
          baseUrl: null,
          initialized: null
        };
      }
      return next;
    },
    default: () => ({
      apiKey: null,
      baseUrl: null,
      initialized: null
    })
  },
  sdk: {
    value: (old: any | null, next: any | null) => next ?? old,
    default: () => null
  },
} as const;

console.log("SDK initialized successfully");

export function createGraph() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels
  });

  return graph
    .addNode("init_sdk_node", async (state: GraphState) => {
      try {
        const result = await initSdkTool.invoke({});
        return result;
      } catch (error) {
        console.error("Error in init_sdk_node:", error);
        throw error;
      }
    })
    .addNode("extract_category_node", async (state: GraphState) => {
      try {
        if (!state.query) {
          throw new Error("Extract category received null query");
        }
        
        const result = await extractCategoryTool.invoke({
          query: state.query
        });
        
        if (!result.queryType || !result.categories) {
          throw new Error("Extract category produced invalid state");
        }
        
        return result;
      } catch (error) {
        console.error("Error in extract_category_node:", error);
        throw error;
      }
    })
    .addNode("select_api_node", async (state: GraphState) => {
      try {
        if (!state.queryType || !state.categories) {
          throw new Error("Select API received invalid state");
        }
        
        // In the execute_request_node handler
        const mappedQueryType = state.entityType === 'user' && state.queryType === 'trending_tracks'
          ? 'trending_artists'
          : state.queryType;

        // Get query analysis results
        const queryAnalysis = analyzeQuery(state.query!);

        const result = await selectApiTool.invoke({
          categories: state.categories,
          entityType: state.entityType,
          queryType: mappedQueryType,
          isTrendingQuery: queryAnalysis.isTrendingQuery,
          isGenreQuery: queryAnalysis.isGenreQuery
        });
        
        const transformedApi = {
          ...result.bestApi,
          description: result.bestApi.api_description,
          parameters: {
            required: result.bestApi.required_parameters.map((p: any) => p.name),
            optional: result.bestApi.optional_parameters.map((p: any) => p.name)
          },
          endpoint: result.bestApi.api_url
        };
        
        return {
          ...result,
          bestApi: transformedApi,
          queryType: state.queryType
        };
      } catch (error) {
        console.error("Error in select_api_node:", error);
        throw error;
      }
    })
    .addNode("extract_params_node", async (state: GraphState) => {
      try {
        if (!state.query || !state.bestApi) {
          throw new Error("Missing required state for parameter extraction");
        }

        // Transform ApiEndpoint to match expected shape
        const transformedApi = {
          ...state.bestApi,
          description: state.bestApi.api_description,
          parameters: {
            required: state.bestApi.required_parameters.map(p => p.name),
            optional: state.bestApi.optional_parameters.map(p => p.name)
          },
          endpoint: state.bestApi.api_url
        };

        const result = await extractParametersTool.invoke({
          query: state.query,
          entityType: state.entityType,
          bestApi: transformedApi
        });
        
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
        console.error("Error in execute_request_node:", error);
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
    .addNode("format_response_node", async (state: GraphState) => {
      try {
        if (!state.response?.data) {
          throw new Error("No response data to format");
        }

        const result = await formatResponseTool.invoke({
          response: {
            data: Array.isArray(state.response.data) ? state.response.data : [state.response.data]
          }
        });

        console.log("\nA:");
        console.log(result.formattedResponse);
        console.log("\n" + "-".repeat(80));

        return {
          ...state,
          formattedResponse: result.formattedResponse
        };

      } catch (error) {
        console.error("Error in format response node:", error);
        return {
          ...state,
          error: {
            code: 'FORMAT_RESPONSE_FAILED',
            message: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
            node: 'format_response_node'
          },
          formattedResponse: null
        };
      }
    })
    .addNode("enhance_response_node", async (state: GraphState) => {
      try {
        if (!state.formattedResponse) {
          throw new Error("No formatted response to enhance");
        }

        const result = await enhanceResponseTool.invoke({
          formatted: state.formattedResponse,
          query: state.query || ""
        });
        
        return {
          ...state,
          formattedResponse: result.enhanced
        };
      } catch (error) {
        console.error("Error in enhance response node:", error);
        return {
          ...state,
          error: {
            code: 'ENHANCE_RESPONSE_FAILED',
            message: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
            node: 'enhance_response_node'
          },
          formattedResponse: null
        };
      }
    })
    .addNode("reset_state_node", async (state: GraphState) => {
      try {
        if (state.response || state.error) {
          const resetResult = await resetState.invoke({});
          return resetResult;
        }
        
        throw new Error("Cannot reset state without response or error");
      } catch (error) {
        console.error("Error in reset_state_node:", error);
        throw error;
      }
    })
    .addEdge(START, "init_sdk_node")
    .addConditionalEdges(
      "init_sdk_node",
      async (input: GraphState, config: any) => input.initialized ? "extract_category_node" : END
    )
    .addEdge("extract_category_node", "select_api_node")
    .addEdge("select_api_node", "extract_params_node")
    .addConditionalEdges(
      "extract_params_node",
      async (input: GraphState, config: any) => {
        try {
          const nextNode = await verifyParams(input);
          console.log("Params verification result:", nextNode);
          return nextNode;
        } catch (error) {
          console.error("Params verification failed:", error);
          return END;
        }
      }
    )
    .addEdge("extract_params_node", "execute_request_node")
    .addEdge("execute_request_node", "format_response_node")
    .addEdge("format_response_node", "enhance_response_node")
    .addEdge("enhance_response_node", "reset_state_node")
    .addConditionalEdges(
      "reset_state_node",
      async (input: GraphState, config: any) => END
    )
    .compile();
}

/**
  * Processes each query through the graph.
  *
  * @param {string[]} queries - The user's queries.
*/
export async function main(queries: string[]) {
  console.log("\n=== Atris ===");

  for (const query of queries) {
    console.log(`\nQ: "${query}"`);

    try {
      const app = createGraph();
      const stream = await app.stream({
        query,
        llm: new ChatOpenAI({
          modelName: 'gpt-3.5-turbo',
          temperature: 0.1,
        }),
        initialized: false
      });

      let gotResponse = false;

      for await (const output of stream) {
        if (output !== END && output.formattedResponse) {
          console.log(`\nA:\n${output.formattedResponse}\n`);
          gotResponse = true;
        }
      }

      if (!gotResponse) {
        console.log("\nA: Sorry, I couldn't get that information right now.\n");
      }

    } catch (error) {
      console.log("\nA: Sorry, I encountered an error processing your request.\n");
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  const testQueries = [
    "What are the top 10 trending tracks on Audius?",
    "What are the most popular playlists right now?",
    "Who are the trending artists this week?",
    "What genres are most popular on Audius?",
    "Show me the top hip-hop tracks"
  ];
  
  console.log("\n=== Starting Atris Backend ===");
  console.log("Test queries:", testQueries);
  
  main(testQueries).catch(error => {
    console.error("Error in main:", error);
    process.exit(1);
  });
}
