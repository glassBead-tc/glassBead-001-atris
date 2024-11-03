import { ChatOpenAI } from "@langchain/openai";
import { GraphState, ErrorState, DatasetSchema, ComplexityLevel, EntityType, QueryType, TrackData, UserData, PlaylistData } from "./types.js";
import { Messages } from '@langchain/langgraph'
import dotenv from 'dotenv';
import {
  extractCategoryTool,
  selectApiTool,
  extractParametersTool,
  createFetchRequestTool,
  verifyParams,
  resetState,
  initSdkTool
} from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { apiValidators } from "./validation/validators/apiValidators.js"; 

dotenv.config();

// Debug logging for environment variables
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
console.log('AUDIUS_API_KEY:', process.env.AUDIUS_API_KEY ? 'Set' : 'Not set');

// Keep existing channel definitions
const graphChannels = {
  llm: {
    value: (old: ChatOpenAI | null, next: any) => {
      console.log("\n=== LLM Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  query: {
    value: (old: string | null, next: string) => {
      console.log("\n=== Query Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  queryType: {
    value: (old: QueryType | null, next: QueryType | null) => {
      console.log("\n=== QueryType Channel Update ===");
      console.log("Old State:", JSON.stringify(old, null, 2));
      console.log("Next State:", JSON.stringify(next, null, 2));
      console.log("Update Stack:", new Error().stack);
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
    value: (old: DatasetSchema[] | null, next: DatasetSchema[] | null) => {
      console.log("\n=== APIs Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  bestApi: {
    value: (old: DatasetSchema | null, next: DatasetSchema | null) => {
      console.log("\n=== Best API Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  parameters: {
    value: (old: Record<string, any> | null, next: Record<string, any> | null) => {
      console.log("\n=== Parameters Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  response: {
    value: (old: { data: (TrackData | UserData | PlaylistData)[] } | null, 
           next: { data: (TrackData | UserData | PlaylistData)[] } | null) => {
      console.log("\n=== Response Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  complexity: {
    value: (old: ComplexityLevel | null, next: ComplexityLevel | null) => {
      console.log("\n=== Complexity Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  isEntityQuery: {
    value: (old: boolean | null, next: boolean | null) => {
      console.log("\n=== IsEntityQuery Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  entityName: {
    value: (old: string | null, next: string | null) => {
      console.log("\n=== EntityName Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  entityType: {
    value: (old: EntityType | null, next: EntityType | null) => {
      console.log("\n=== EntityType Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  error: {
    value: (old: ErrorState | null, next: ErrorState | null) => {
      console.log("\n=== Error Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  errorHistory: {
    value: (old: ErrorState[], next: ErrorState) => {
      console.log("\n=== ErrorHistory Channel Update ===");
      console.log("Old State:", old);
      console.log("Next Error:", next);
      const result = [...(old || []), next];
      console.log("Result:", result);
      return result;
    },
    default: () => []
  },
  messages: {
    value: (old: Messages | null, next: Messages | null) => {
      console.log("\n=== Messages Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  messageHistory: {
    value: (old: Messages[], next: Messages) => [...(old || []), next],
    default: () => []
  },
  selectedHost: {
    value: (old: string | null, next: string | null) => {
      console.log("\n=== SelectedHost Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  entity: {
    value: (old: any | null, next: any | null) => {
      console.log("\n=== Entity Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  secondaryApi: {
    value: (old: DatasetSchema | null, next: DatasetSchema | null) => {
      console.log("\n=== SecondaryApi Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  secondaryResponse: {
    value: (old: string | null, next: string | null) => {
      console.log("\n=== SecondaryResponse Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  initialState: {
    value: (old: GraphState | null, next: GraphState | null) => {
      console.log("\n=== InitialState Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  },
  formattedResponse: {
    value: (old: string | null, next: string | null) => {
      console.log("\n=== FormattedResponse Channel Update ===");
      console.log("Old State:", old);
      console.log("Next State:", next);
      const result = next ?? old;
      console.log("Result:", result);
      return result;
    },
    default: () => null
  }
} as const;


export function createGraph() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels
  });

  return graph
    .addNode("init_sdk_node", async () => {
      const result = await initSdkTool.invoke({})
      return result
    })
    .addNode("extract_category_node", async (state: GraphState) => {
      const result = await extractCategoryTool.invoke({
        query: state.query || ''
      })
      return result
    })
    .addNode("select_api_node", selectApiTool)
    .addNode("extract_params_node", extractParametersTool)
    .addNode("execute_request_node", async (state: GraphState) => {
      const { parameters, bestApi } = state
      
      if (!bestApi) {
        throw new Error("No bestApi found in state")
      }

      const input = {
        parameters: parameters || {},
        bestApi: {
          api_name: bestApi.api_name
        }
      }

      const result = await createFetchRequestTool.invoke(input)
      return result
    })
    .addNode("reset_state_node", resetState)
    
    // Update edges
    .addEdge(START, "init_sdk_node")
    .addEdge("init_sdk_node", "extract_category_node")
    .addEdge("extract_category_node", "select_api_node")
    .addEdge("select_api_node", "extract_params_node")
    .addEdge("extract_params_node", "execute_request_node")
    .addEdge("execute_request_node", "reset_state_node")
    .addEdge("reset_state_node", END)
    
    // Keep conditional edges
    .addConditionalEdges(
      "extract_params_node",
      async (state: GraphState) => {
        try {
          const result = await verifyParams(state)
          return result
        } catch (error) {
          console.error("Params verification failed:", error)
          return END
        }
      }
    )
    .compile()
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

if (process.env.NODE_ENV !== 'test') {
  const testQueries = [
    "What are the top 10 trending tracks on Audius?",
    "How many plays does the track '115 SECONDS OF CLAMS' have?",
    "Who has the most followers on Audius?"
  ];
  
  console.log("\n=== Starting Atris Backend ===");
  console.log("Test queries:", testQueries);
  
  main(testQueries).catch(error => {
    console.error("Error in main:", error);
    process.exit(1);
  });
}
