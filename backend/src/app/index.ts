import { logger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import { ComplexityLevel, DatasetSchema, EntityType, AudiusCorpus, GraphState } from "./types.js";
import fs from "fs";
import dotenv from 'dotenv';
import { extractCategory, extractParameters, createFetchRequest, selectApi, searchEntity, formatResponse, readUserInputTool } from "./tools/tools.js";
import { StateGraph, END, START } from "@langchain/langgraph";
import { TRIMMED_CORPUS_PATH } from "./constants.js";
import { findMissingParams } from "./utils.js";
import { getTrack } from "./tools/getTrack.js"; 

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

// export interface GraphState {
//   llm: ChatOpenAI | null;
//   query: string | null;
//   queryType: string | null;
//   categories: string[] | null;
//   apis: DatasetSchema[] | null;
//   bestApi: DatasetSchema | null;
//   params: Record<string, string> | null;
//   response: any | null;
//   complexity: string | null;
//   isEntityQuery: boolean;
//   entityName: string | null;
//   entityType: EntityType | null;
//   parameters: Record<string, any> | null;
//   error: boolean;
//   selectedHost: string | null;
//   entity: Track | User | Playlist | null;
//   secondaryApi: DatasetSchema | null;
//   secondaryResponse: any | null;
//   multiStepHandled: boolean;
//   initialState: GraphState | null;
//   formattedResponse: string | null;
//   message: string | null;
// }

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



function getApis(state: GraphState) {
  logger.debug('getApis called with categories:', state.categories);
  
  if (!state.categories || state.categories.length === 0) {
    logger.error("No categories available in state for getApis.");
    throw new Error("No categories passed to get_apis_node");
  }

  // Parse the JSON and access the endpoints array
  const allData: AudiusCorpus = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf8"));
  const endpoints = allData.endpoints;

  logger.debug('All available APIs:', endpoints.map(api => api.api_name));

  const apis = state.categories
    .map((category) => {
      // Filter APIs by category_name
      const matchedApis = endpoints.filter((endpoint) => endpoint.category_name === category);
      logger.debug(`Matched APIs for category "${category}":`, matchedApis.map(api => api.api_name));
      return matchedApis;
    })
    .flat();

  if (apis.length === 0) {
    logger.error("No APIs found for the given categories.");
    throw new Error("No APIs available for selection.");
  }

  logger.debug('APIs selected for the query:', apis.map(api => api.api_name));

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
    .addNode("search_entity_node", async (state: GraphState) => {
      logger.debug("search_entity_node received state:", {
        trackTitle: state.parameters?.trackTitle,
        track_id: state.parameters?.track_id,
      });
      const result = await searchEntity(state);
      logger.debug("search_entity_node output:", result);
      return result;
    })
    .addNode("get_track_node", async (state: GraphState) => {
      logger.debug("get_track_node received state:", {
        track_id: state.parameters?.track_id,
      });
      const result = await getTrack(state.parameters!.track_id);
      logger.debug("get_track_node output:", result);
      return {
        trackDetails: result,
      };
    })
    .addNode("human_loop_node", readUserInputTool)
    .addNode("execute_request_node", createFetchRequest)
    .addNode("format_response_node", formatResponse)
    .addEdge("extract_category_node", "get_apis_node")
    .addEdge("get_apis_node", "select_api_node")
    .addEdge("select_api_node", "extract_params_node")
    .addEdge("extract_params_node", "search_entity_node")
    .addEdge("search_entity_node", "get_track_node") // 将 get_track_node 添加到流程中
    .addEdge("get_track_node", "human_loop_node") // 如果需要人工输入，转到人工循环
    .addConditionalEdges("human_loop_node", (state: GraphState) => {
      return state.error ? "execute_request_node" : "execute_request_node"; // 根据需要调整逻辑
    })
    .addEdge("execute_request_node", "format_response_node")
    .addEdge("format_response_node", END)
    .addEdge(START, "extract_category_node");

  logger.info("Graph created successfully.");

  return graph.compile();
}

const datasetQuery = "How many plays does 115 SECONDS OF CLAMS have on Audius?";

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







