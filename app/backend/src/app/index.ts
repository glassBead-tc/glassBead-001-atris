import { logger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "./types.js";
import dotenv from 'dotenv';
import {
  extractCategoryTool,
  readUserInputTool,
  selectApiTool,
  extractParametersTool,
  createFetchRequestTool,
  getApis,
  verifyParams
} from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { findMissingParams } from "./utils.js";

dotenv.config({ path: '../.env' });
const graphChannels = {
  llm: null,
  query: null,
  queryType: null,
  categories: null,
  apis: null,
  bestApi: null,
  parameters: null,
  response: null,
  complexity: null,
  isEntityQuery: null,
  entityName: null,
  entityType: null,
  error: null,
  messages: null,
  selectedHost: null,
  entity: null,
  secondaryApi: null,
  secondaryResponse: null,
  multiStepHandled: null,
  initialState: null,
  formattedResponse: null,
  message: null,
};

/**
 * Creates and configures the graph.
 *
 * @returns {CompiledStateGraph} - The compiled state graph.
 */
function createGraph() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels,
  })
    .addNode("extract_category_node", extractCategoryTool)
    .addNode("get_apis_node", getApis)
    .addNode("select_api_node", selectApiTool)
    .addNode("extract_params_node", extractParametersTool)
    .addNode("human_loop_node", readUserInputTool)
    .addNode("execute_request_node", createFetchRequestTool)
    .addEdge("extract_category_node", "get_apis_node")
    .addEdge("get_apis_node", "select_api_node")
    .addEdge("select_api_node", "extract_params_node")
    .addConditionalEdges("extract_params_node", verifyParams)
    .addConditionalEdges("human_loop_node", verifyParams)
    .addEdge("execute_request_node", END)
    .addEdge(START, "extract_category_node");

  logger.info("Graph created successfully.");

  return graph.compile();
}

/**
 * Processes each query through the graph.
 *
 * @param {string[]} queries - The user's queries.
 */
async function main(queries: string[]) {
  const app = createGraph();

  const llm = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  for (const query of queries) {
    console.log("\n=== Processing Query ===");
    console.log(`Input: "${query}"`);

    try {
      const stream = await app.stream({
        llm,
        query,
      });

      let finalResult: GraphState | null = null;
      for await (const event of stream) {
        const eventName = Object.keys(event)[0];
        const state = event[eventName];

        // Log detailed state transitions
        switch(eventName) {
          case "extract_category_node":
            console.log("\n=== Query Analysis ===");
            console.log(`Detected Entity Type: ${state.entityType}`);
            console.log(`Categorized as: ${state.categories?.join(', ')}`);
            if (state.queryType === 'trending_tracks') {
              console.log(`Query Type: ${state.queryType}`);
            }
            break;

          case "select_api_node":
            console.log("\n=== API Selection ===");
            console.log(`Selected API: ${state.bestApi?.api_name}`);
            break;

          case "extract_params_node":
            console.log("\n=== Parameter Extraction ===");
            if (state.queryType === 'trending_tracks') {
              console.log("Processing trending tracks query...");
            }
            Object.entries(state.parameters || {}).forEach(([key, value]) => {
              console.log(`${key}: ${value}`);
            });
            break;

          case "execute_request_node":
            console.log("\n=== API Response ===");
            if (state.error) {
              console.error("Error in API response:", state.error);
            } else {
              console.log(state.response);
            }
            finalResult = state;
            break;
        }
      }

      if (!finalResult) {
        throw new Error("No final result");
      }

      console.log("\n=== Processing Complete ===");
    } catch (error: any) {
      console.error(`Error processing query "${query}":`, error instanceof Error ? error.message : String(error));
      logger.error(`Failed to process query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Clean exit
  process.exit(0);
}

const datasetQuery = [
  "How many plays does 115 SECONDS OF CLAMS have on Audius?",
  "How many followers does TRICK CHENEY. have?",
  "How many songs does the playlist glassBead's got game, vol. 1 have in it?",
  "What is the genre of the song 115 SECONDS OF CLAMS?",
  "What are the top ten trending tracks on Audius right now?"
];

main(datasetQuery).catch((error: Error) => {
  logger.error(`Error during execution: ${error.message}`);
  process.exit(1);
});
