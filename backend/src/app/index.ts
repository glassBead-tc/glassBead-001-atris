import { logger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import { GraphState, QueryType, EntityType } from "./types.js";
import fs from "fs";
import dotenv from 'dotenv';
import {
  extractCategory,
  searchEntityTool,
  readUserInputTool,
  selectApiTool,
  extractParametersTool,
  createFetchRequestTool,
} from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { TRIMMED_CORPUS_PATH } from "./constants.js";
import { findMissingParams } from "./utils.js";
import { string } from "zod";

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
    return "human_loop_node";
  }
  const requiredParamsKeys = (bestApi.required_parameters || []).map(({ name }) => name);
  const extractedParamsKeys = Object.keys(parameters);
  const missingKeys = findMissingParams(
    requiredParamsKeys,
    extractedParamsKeys
  );
  if (missingKeys.length > 0) {
    return "human_loop_node";
  }
  return "execute_request_node";
};

/**
 * Fetches the list of available APIs based on the extracted categories.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {Partial<GraphState>} - The updated state with the list of APIs.
 */
function getApis(state: GraphState) {
  logger.debug('getApis called with categories:', state.categories);
  
  if (!state.categories || state.categories.length === 0) {
    logger.error("No categories available in state for getApis.");
    throw new Error("No categories passed to get_apis_node");
  }

  // Parse the JSON and access the endpoints array
  const allData: any = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf8"));
  const endpoints = allData.endpoints;

  logger.debug('All available APIs:', endpoints.map((api: { api_name: string }) => api.api_name));

  const apis = state.categories
    .map((category) => {
      // Filter APIs by category_name
      const matchedApis = endpoints.filter((endpoint: any) => endpoint.category_name === category);
      logger.debug(`Matched APIs for category "${category}":`, matchedApis.map((api: any) => api.api_name));
      return matchedApis;
    })
    .flat();

  if (apis.length === 0) {
    logger.error("No APIs found for the given categories.");
    throw new Error("No APIs available for selection.");
  }

  logger.debug('APIs selected for the query:', apis.map((api: any) => api.api_name));

  return {
    apis,
  };
}

/**
 * Creates and configures the graph.
 *
 * @returns {CompiledStateGraph} - The compiled state graph.
 */
function createGraph() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels,
  })
    .addNode("extract_category_node", extractCategory)
    .addNode("get_apis_node", getApis)
    .addNode("select_api_node", selectApiTool)
    .addNode("extract_params_node", extractParametersTool)
    .addNode("search_entity_node", searchEntityTool)
    .addNode("human_loop_node", readUserInputTool)
    .addNode("execute_request_node", createFetchRequestTool)
    // Removed format_response_node
    .addConditionalEdges("search_entity_node", (state: GraphState) => {
      return verifyParams(state) as "human_loop_node" | "execute_request_node";
    })
    .addEdge("human_loop_node", "execute_request_node")
    .addEdge("execute_request_node", END) // Directly end after execute_request_node
    .addEdge(START, "extract_category_node");

  logger.info("Graph created successfully.");

  return graph.compile();
}

/**
 * Processes the query through the graph.
 *
 * @param {string} query - The user's query.
 */
async function main(query: string) {
  const app = createGraph();

  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  });

  const stream = await app.stream({
    query,
  });

  let finalResult: GraphState | null = null;
  for await (const event of stream) {
    console.log("\n------\n");
    const eventName = Object.keys(event)[0];
    console.log("Stream event:", eventName);

    // Log the state after each event
    console.log("State after event:", event[eventName]);

    if (eventName === "execute_request_node") {
      console.log("---FINISHED---");
      finalResult = event.execute_request_node;
    }
  }

  if (!finalResult) {
    throw new Error("No final result");
  }

  console.log("---FORMATTED RESPONSE---");
  console.log(finalResult.response);
}

const datasetQuery = "How many plays does 115 SECONDS OF CLAMS have on Audius?";

main(datasetQuery).catch(error => {
  logger.error(`Error during execution: ${error.message}`);
});
