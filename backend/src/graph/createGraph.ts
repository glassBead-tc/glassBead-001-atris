import { END, START, StateGraph } from "@langchain/langgraph";
import { extractCategory } from "../tools/extract_category.js";
import { getApis } from "../tools/get_apis.js";
import { selectApi } from "../tools/select_api.js";
import { extractParameters } from "../tools/extract_parameters.js";
import { GraphState } from "../types.js";
import lodash from 'lodash';
import { requestParameters } from "tools/request_parameters.js";

const { merge } = lodash;

const graphChannels = {
  llm: null,
  query: null,
  categories: null,
  apis: null,
  bestApi: null,
  params: null,
  response: null,
};

export function createGraph() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels,
  })
    .addNode("extract_category_node", extractCategory)
    .addNode("get_apis_node", getApis)
    .addNode("select_api_node", selectApi)
    .addNode("extract_params_node", extractParameters)
    .addNode("execute_request_node", requestParameters)
    .addEdge("extract_category_node", "get_apis_node")
    .addEdge("get_apis_node", "select_api_node")
    .addEdge("select_api_node", "extract_params_node")
    .addEdge("extract_params_node", "execute_request_node")
    .addEdge(START, "extract_category_node")
    .addEdge("execute_request_node", END);

  return graph.compile();
}