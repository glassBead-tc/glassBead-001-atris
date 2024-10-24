
import { logger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import { ComplexityLevel, DatasetSchema, EntityType } from "./types.js";
import fs from "fs";
import dotenv from 'dotenv';
import { ALL_TOOLS_LIST, extractCategory, extractParameters, createFetchRequest, selectApi, requestParameters } from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { TRIMMED_CORPUS_PATH } from "./constants.js";
import { findMissingParams } from "./utils.js";

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
  isEntityQuery: boolean;
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
    .addEdge("extract_category_node", "get_apis_node")
    .addEdge("get_apis_node", "select_api_node")
    .addEdge("select_api_node", "extract_params_node")
    .addConditionalEdges("extract_params_node", verifyParams)
    .addConditionalEdges("human_loop_node", verifyParams)
    .addEdge(START, "extract_category_node")
    .addEdge("execute_request_node", END);

  const app = graph.compile();
  return app;
}

const datasetQuery = "How many plays does 115 SECONDS OF CLAMS by TRICK CHENEY. have on Audius?";

async function main(query: string) {
  const app = createGraph();

  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  });

  const stream = await app.stream({
    llm,
    query,
  });

  let finalResult: GraphState | null = null;
  for await (const event of stream) {
    console.log("\n------\n");
    if (Object.keys(event)[0] === "execute_request_node") {
      console.log("---FINISHED---");
      finalResult = event.execute_request_node;
    } else {
      console.log("Stream event: ", Object.keys(event)[0]);
      // Uncomment the line below to see the values of the event.
      // console.log("Value(s): ", Object.values(event)[0]);
    }
  }

  if (!finalResult) {
    throw new Error("No final result");
  }
  if (!finalResult.bestApi) {
    throw new Error("No best API found");
  }


  console.log("---FETCH RESULT---");
  console.log(finalResult.response);
}

main(datasetQuery);