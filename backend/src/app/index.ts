import { logger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import { DatasetSchema } from "./types.js";
import fs from "fs";
import { findMissingParams } from "./utils.js";
import { TRIMMED_CORPUS_PATH } from "./constants.js";
import { END, StateGraph } from "@langchain/langgraph";
import { START } from "@langchain/langgraph";
import { extractParameters } from "./tools/ExtractParametersTool.js";
import { extractCategory } from "./tools/ExtractCategoryTool.js";
import { requestParameters } from "./tools/RequestParametersTool.js";
import { selectApi } from "./tools/SelectApiTool.js";
import { createFetchRequest } from "./tools/CreateFetchRequestTool.js";
import { processApiResponse } from "./tools/ProcessApiResponseTool.js";

import dotenv from 'dotenv';

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
   * The error message
   */
  errorMessage: string | null;
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
  errorMessage: null,
};

/**
* @param {GraphState} state
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

async function main() {
  logger.info("Starting main execution");
  logger.info(`OpenAI API Key: ${process.env.OPENAI_API_KEY}`);

  const atris = createGraph();

  // Initialize the LLM (ChatOpenAI)
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini", // Or another model as appropriate
    temperature: 0,
  });


  /**
 * TODO: implement
 */
function createGraph() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels,
  })
    .addNode("extract_category_node", extractCategory)
    .addNode("get_apis_node", getApis)
    .addNode("select_api_node", selectApi)
    .addNode("extract_params_node", extractParameters)
    .addNode("human_loop_node", requestParameters)
    .addNode("execute_request_node", createFetchRequest)
    .addNode("process_api_response", processApiResponse)
    .addEdge("extract_category_node", "get_apis_node")
    .addEdge("get_apis_node", "select_api_node")
    .addEdge("select_api_node", "extract_params_node")
    .addConditionalEdges("extract_params_node", verifyParams)
    .addConditionalEdges("human_loop_node", verifyParams)
    .addEdge(START, "extract_category_node")
    .addEdge("execute_request_node", "process_api_response")
    .addEdge("process_api_response", END);

  const app = graph.compile();
  return app;
}



  const queries = [
    "What are the trending tracks on Audius?",
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
      errorMessage: null,
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

main().catch(error => {
  logger.error("Unhandled error in main:", error);
});
