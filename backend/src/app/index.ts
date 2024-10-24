import { logger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import { ComplexityLevel, DatasetSchema, EntityType } from "./types.js";
import fs from "fs";
import dotenv from 'dotenv';
import { extractCategory, extractParameters, createFetchRequest, requestParameters, selectApi, ALL_TOOLS_LIST } from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { findMissingParams } from "./utils.js";
import { TRIMMED_CORPUS_PATH } from "./constants.js";
import { StructuredToolInterface } from "@langchain/core/tools";

dotenv.config({ path: '../.env' });

export type GraphState = {
  /**
   * The LLM to use for the graph
   */
  llm: ChatOpenAI;
  /**
   * The query to extract an API for
   */
  query: string;
  /**
   * The type of the query
   */
  queryType: string | null;
  /**
   * The relevant API categories for the query
   */
  categories: string[] | null;
  /**
   * The relevant APIs from the categories
   */
  apis: DatasetSchema[] | null;
  /**
   * The most relevant API for the query
   */
  bestApi: DatasetSchema | null;
  /**
   * The params for the API call
   */
  parameters: Record<string, string> | null;
  /**
   * The API response
   */
  response: Record<string, any> | null;
  /**
   * The error message
   */
  error: boolean;
  /**
   * The state messages
   */
  messages: string[] | null;
  /**
   * 
   */
  complexity: ComplexityLevel | null;
  /**
   * Is this an entity query?
   */
  isEntityQuery: boolean
  /**
   * The name of the entity
   */
  entityName: string | null;
  /**
   * The type of the entity
   */
  entityType: EntityType | null;
};

const graphChannels = {
  llm: null,
  query: null,
  queryType: null,
  categories: null,
  apis: null,
  bestApi: null,
  parameters: null,
  response: null,
  error: null,
  messages: null,
  complexity: null,
  isEntityQuery: null,
  entityName: null,
  entityType: null,
};

/**
 * Determines the next node based on the current state.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {"human_loop_node" | "execute_request_node"} - The next node to transition to.
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
  const requiredParamsKeys = bestApi.required_parameters.map(
    ({ name }) => name
  );
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
 * Retrieves the APIs based on the selected categories.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {{ apis: DatasetSchema[] }} - The filtered list of APIs.
 */
function getApis(state: GraphState) {
  const { categories } = state;
  if (!categories || categories.length === 0) {
    throw new Error("No categories passed to get_apis_node");
  }
  const allData: DatasetSchema[] = JSON.parse(
    fs.readFileSync(TRIMMED_CORPUS_PATH, "utf8")
  );

  const apis = categories
    .map((c) => allData.filter((d) => d.category_name === c))
    .flat();

  return {
    apis,
  };
}

/**
 * Creates the state graph for the application.
 *
 * @returns {StateGraph<GraphState>} - The compiled state graph.
 */
function createGraph() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels,
  })
    .addNode("extract_category_node", extractCategory) // get categories from user query
    .addNode("get_apis_node", getApis) // get appropriate APIs for high-level categories
    .addNode("select_api_node", selectApi) // select most relevant API endpoint among category group for use
    .addNode("extract_params_node", extractParameters) // extract parameters for API call
    .addNode("human_loop_node", requestParameters) // request parameters from user if required param is missing
    .addNode("execute_request_node", createFetchRequest) // execute API call
    .addEdge("extract_category_node", "get_apis_node") // extract categories -> get APIs
    .addEdge("get_apis_node", "select_api_node") // get APIs -> select API
    .addEdge("select_api_node", "extract_params_node") // select API -> extract params
    .addConditionalEdges("extract_params_node", verifyParams) // extract params -> verify params if params are missing
    .addConditionalEdges("human_loop_node", verifyParams) // request params -> verify params with user to get missing params
    .addEdge(START, "extract_category_node") // start -> extract categories
    .addEdge("execute_request_node", END); // process response -> end

  const app = graph.compile();
  return app;
};

/**
 * Example of using a tool from ALL_TOOLS_LIST
 */
async function main() {
  const llm = new ChatOpenAI(/* your configurations */);
  
  let state: GraphState = {
    llm,
    query: "Find popular playlists for jazz music.",
    queryType: null,
    categories: null,
    apis: null,
    bestApi: null,
    parameters: null,
    response: null,
    complexity: null,
    isEntityQuery: false,
    entityName: null,
    entityType: null,
    error: false,
    messages: [],
    // Initialize other properties as needed
  };

  try {
    // Example tool execution
    const extractCategory = ALL_TOOLS_LIST["extractCategory"] as StructuredToolInterface;
    const { category } = await extractCategory.run({ query: state.query! });
    state = { ...state, categories: [...(state.categories || []), category] };
    
    const extractParameters = ALL_TOOLS_LIST["extractParameters"] as StructuredToolInterface;
    const { extractedParameters } = await extractParameters.run({ parameters: ["param1", "param2"] });
    state = { ...state, parameters: extractedParameters };
    
    const requestParameters = ALL_TOOLS_LIST["requestParameters"] as StructuredToolInterface;
    const { requestedParameters } = await requestParameters.run({ missingParams: ["param3"] });
    state = { ...state, parameters: { ...state.parameters, ...requestedParameters } };
    
    // ... Continue with other tool executions ...
    
    logger.info("Main execution completed");
  } catch (error) {
    logger.error("Error during main execution:", error);
  }
}
