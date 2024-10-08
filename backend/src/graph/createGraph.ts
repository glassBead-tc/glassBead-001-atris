import { END, START, StateGraph } from "@langchain/langgraph";
import { extractCategory } from "../tools/extract_category.js";
import { getApis } from "../tools/get_apis.js";
import { selectApi } from "../tools/select_api.js";
import { extractParameters } from "../tools/extract_parameters.js";
import { createFetchRequest } from "../tools/create_fetch_request.js";
import { GraphState } from "../types.js";
import lodash from 'lodash';

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
    .addNode("extract_category_node", async (state) => {
      const partialState = await extractCategory(state);
      const newState = merge({}, state, partialState);
      return newState;
    })
    .addNode("get_apis_node", async (state) => {
      const newState = await getApis(state);
      return newState;
    })
    .addNode("select_api_node", async (state) => {
      const newState = await selectApi(state);
      return newState;
    })
    .addNode("extract_params_node", async (state) => {
      const newState = await extractParameters(state);
      return newState;
    })
    .addNode("execute_request_node", async (state) => {
      const newState = await createFetchRequest(state);
      return newState;
    })
    .addEdge("extract_category_node", "get_apis_node")
    .addEdge("get_apis_node", "select_api_node")
    .addEdge("select_api_node", "extract_params_node")
    .addEdge("extract_params_node", "execute_request_node")
    .addEdge(START, "extract_category_node")
    .addEdge("execute_request_node", END);

  return graph.compile();
}