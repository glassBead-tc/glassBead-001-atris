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
  getApis
} from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { findMissingParams } from "./utils.js";

dotenv.config({ path: '../.env' }); // Confirm this path is accurate based on your project structure
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
 * Verifies the presence of required parameters.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {string} - Determines the next node based on parameter verification.
 */
const verifyParams = (
  state: GraphState
): "human_loop_node" | "execute_request_node" => {
  const { bestApi, parameters } = state;
  
  if (!bestApi) {
    throw new Error("No best API found");
  }
  
  if (!parameters) {
    console.warn("Parameters are missing. Redirecting to human_loop_node.");
    return "human_loop_node";
  }

  // Check if we have all required parameters for the selected API
  const requiredParamsKeys = bestApi.required_parameters.map(({ name }) => name);
  const extractedParamsKeys = Object.keys(parameters);
  
  // Use only trackTitle for Search Tracks API
  if (bestApi.api_name === 'Search Tracks' && parameters.trackTitle) {
    parameters.query = parameters.trackTitle;
  }

  const missingKeys = findMissingParams(requiredParamsKeys, extractedParamsKeys);
  
  if (missingKeys.length > 0) {
    console.warn(`Missing parameters: ${missingKeys.join(", ")}`);
    return "human_loop_node";
  }

  return "execute_request_node";
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
    modelName: "gpt-4",
    temperature: 0,
  });

  for (const query of queries) {
    console.log("\n=== Processing Query ===");
    console.log(`Input: "${query}"`);

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
          break;

        case "select_api_node":
          console.log("\n=== API Selection ===");
          console.log(`Selected API: ${state.bestApi?.api_name}`);
          break;

        case "extract_params_node":
          console.log("\n=== Parameter Extraction ===");
          Object.entries(state.parameters || {}).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
          });
          break;

        case "execute_request_node":
          console.log("\n=== API Response ===");
          console.log(state.response);
          finalResult = state;
          break;
      }
    }

    if (!finalResult) {
      throw new Error("No final result");
    }

    console.log("\n=== Processing Complete ===");
  }

  // {{ edit_2 }} Forcefully exit the process if necessary (use cautiously)
  process.exit(0);
}

const datasetQuery = [
  "How many plays does 115 SECONDS OF CLAMS have on Audius?",
  "How many followers does TRICK CHENEY. have?",
  "How many songs does the playlist glassBead's got game, vol. 1 have in it?"
];

main(datasetQuery).catch(error => {
  logger.error(`Error during execution: ${error.message}`);
  process.exit(1);
});
