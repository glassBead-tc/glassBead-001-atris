import { logger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "./types.js";
import fs from "fs";
import dotenv from 'dotenv';
import {
  extractCategoryTool,
  searchEntityTool,
  readUserInputTool,
  selectApiTool,
  extractParametersTool,
  createFetchRequestTool,
} from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { TRIMMED_CORPUS_PATH } from "./constants.js";
import { findMissingParams } from "./utils.js";
import { DatasetSchema } from "./types.js";

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
  
  // For Search Tracks API, we need to use trackTitle as the query parameter
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

  // Remove duplicate APIs based on 'api_name'
  const uniqueApis = Array.from(
    new Map(endpoints.map((api: any) => [api.api_name, api])).values()
  );

  // Validate that each API has the required fields
  const validatedApis = uniqueApis.filter((api: any) => {
    const hasRequiredFields = api.api_name && Array.isArray(api.required_parameters);
    if (!hasRequiredFields) {
      logger.warn(`API "${api.api_name || 'Unnamed API'}" is missing required fields and will be excluded.`);
    }
    return hasRequiredFields;
  });

  // Transform validated APIs to match DatasetSchema
  const transformedApis: DatasetSchema[] = validatedApis.map((api: any) => ({
    id: api.id,
    category_name: api.category_name,
    tool_name: api.tool_name,
    api_name: api.api_name,
    api_description: api.api_description,
    required_parameters: api.required_parameters,
    optional_parameters: api.optional_parameters,
    method: api.method,
    template_response: api.template_response,
    api_url: api.api_url,
  }));

  const apis = state.categories
    .map((category) => {
      // Filter APIs by category_name
      const matchedApis = transformedApis.filter((endpoint: DatasetSchema) => endpoint.category_name === category);
      logger.debug(`Matched APIs for category "${category}":`, matchedApis.map((api: DatasetSchema) => api.api_name));
      return matchedApis;
    })
    .flat();

  // Ensure 'apis' is not empty after filtering and validation
  if (apis.length === 0) {
    logger.error("No valid APIs found for the given categories after filtering.");
    throw new Error("No valid APIs available for selection after filtering.");
  }

  logger.debug('APIs selected for the query:', apis.map((api: DatasetSchema) => api.api_name));

  return {
    ...state,
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
 * Processes the query through the graph.
 *
 * @param {string} query - The user's query.
 */
async function main(query: string) {
  const app = createGraph();

  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0,
  });

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


  // {{ edit_2 }} Forcefully exit the process if necessary (use cautiously)
  process.exit(0);
}

const datasetQuery = "How many plays does 115 SECONDS OF CLAMS have on Audius?";

main(datasetQuery).catch(error => {
  logger.error(`Error during execution: ${error.message}`);
  process.exit(1);
});
