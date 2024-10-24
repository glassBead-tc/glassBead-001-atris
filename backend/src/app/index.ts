import { ToolNode } from "@langchain/langgraph/prebuilt";
import { logger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import { DatasetSchema } from "./types.js";
import fs from "fs";
import dotenv from 'dotenv';
import { ALL_TOOLS_LIST } from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { findMissingParams } from "./utils.js";
import { TRIMMED_CORPUS_PATH } from "./constants.js";
import { StructuredToolInterface } from "@langchain/core/tools";
import { RunnableToolLike } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools"

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
};

const graphChannels = {
  llm: null,
  query: null,
  categories: null,
  apis: null,
  bestApi: null,
  parameters: null,
  response: null,
  error: null,
  messages: null,
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
 * Determines the continuation condition based on the current state.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {string | string[]} - The next node(s) to transition to.
 */
const shouldContinue = (state: GraphState) => {
  const { messages } = state;

  if (!messages || messages.length === 0) {
    return END;
  }

  const lastMessage = messages[messages.length - 1];

  // Use the type guard to verify if lastMessage is an AIMessage
  if (isAIMessage(lastMessage) && lastMessage.tool_calls?.length) {
    // LLM called tools; proceed accordingly
  } else {
    // LLM did not call any tools, or it's not an AI message, so we should end.
    return END;
  }

  const { tool_calls } = lastMessage;
  if (!tool_calls?.length) {
    throw new Error(
      "Expected tool_calls to be an array with at least one element"
    );
  }

  return tool_calls.map((tc) => {
    if (tc.name === "purchase_stock") {
      // The user is trying to purchase a stock, route to the verify purchase node.
      return "prepare_purchase_details";
    } else {
      return "tools";
    }
  });
};

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
    .addNode("process_api_response", processApiResponseTool) // process API response
    .addEdge("extract_category_node", "get_apis_node") // extract categories -> get APIs
    .addEdge("get_apis_node", "select_api_node") // get APIs -> select API
    .addEdge("select_api_node", "extract_params_node") // select API -> extract params
    .addConditionalEdges("extract_params_node", verifyParams) // extract params -> verify params if params are missing
    .addConditionalEdges("human_loop_node", verifyParams) // request params -> verify params with user to get missing params
    .addEdge(START, "extract_category_node") // start -> extract categories
    .addEdge("execute_request_node", "process_api_response") // execute API -> process response
    .addEdge("process_api_response", END); // process response -> end

  const app = graph.compile();
  return app;
};

/**
 * Initializes and runs the main execution flow.
 */
async function main() {
  logger.info("Starting main execution");

  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini", // Or another model as appropriate
    temperature: 0,
  });

  // Bind the tools from ALL_TOOLS_LIST to the LLM
  const tools: (StructuredToolInterface | RunnableToolLike)[] = Object.values(ALL_TOOLS_LIST);
  const modelWithTools = llm.bindTools(tools);

  const atris = createGraph();

  const queries = [
    "What are the top trending tracks on Audius?",
    "Find me playlists with over 10,000 plays.",
    "What are the most popular genres on Audius?",
    // Add other test queries as needed
  ];

  for (const query of queries) {
    logger.info(`Processing query: ${query}`);

    const initialState: GraphState = {
      llm,
      query,
      categories: [],
      apis: [],
      bestApi: null,
      parameters: null,
      response: null,
      error: false,
      messages: [],
    };

    try {
      const result = await atris.invoke(initialState);
      console.log(`Response:\n${result.formattedResponse}`);
    } catch (error) {
      logger.error("Error during graph execution:", error);
    }

    console.log("--------------------");
  }

  logger.info("Main execution completed");
}

/**
 * Starts the application and handles any unhandled errors.
 */
main().catch(error => {
  logger.error("Unhandled error in main:", error);
});

/**
 * Type guard to check if a message is of type AIMessage.
 *
 * @param {BaseMessage} message - The message to check.
 * @returns {boolean} - True if the message is an AIMessage, false otherwise.
 */
function isAIMessage(message: BaseMessage): message is AIMessage {
  return (message as AIMessage)._getType() === "ai";
}

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
    params: null,
    response: null,
    complexity: null,
    isEntityQuery: false,
    entityName: null,
    entity: null,
    parameters: null,
    complexity: null,
    multiStepHandled: false,
    initialState: null,
    entityType: null,
    stateMessages: [],
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
