import { END, START, StateGraph } from "@langchain/langgraph";
import { extractCategory } from "../tools/extract_category.js";
import { getApis } from "../tools/get_apis.js";
import { selectApi } from "../tools/select_api.js";
import { extractParameters } from "../tools/extract_parameters.js";
import { GraphState } from "../types.js";
import { requestParameters } from "../tools/request_parameters.js";
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { DatasetSchema } from "../types.js";

export function createGraph(llm: ChatOpenAI<ChatOpenAICallOptions>) {
  const graph = new StateGraph<GraphState>({
    channels: {
      llm: { 
        default: () => llm,
        reducer: (_current: ChatOpenAI<ChatOpenAICallOptions> | null, newVal: ChatOpenAI<ChatOpenAICallOptions> | null) => newVal ?? null
      },
      query: { 
        default: () => null,
        reducer: (_current: string | null, newVal: string | null) => newVal ?? null
      },
      categories: { 
        default: () => null,
        reducer: (_current: string[] | null, newVal: string[] | null) => newVal ?? null
      },
      apis: { 
        default: () => null,
        reducer: (_current: DatasetSchema[] | null, newVal: DatasetSchema[] | null) => newVal ?? null
      },
      bestApi: { 
        default: () => null,
        reducer: (_current: DatasetSchema | null, newVal: DatasetSchema | null) => newVal ?? null
      },
      params: { 
        default: () => null,
        reducer: (_current: Record<string, string> | null, newVal: Record<string, string> | null) => newVal ?? null
      },
      response: { 
        default: () => null,
        reducer: (_current: any | null, newVal: any | null) => newVal ?? null
      },
    },
  });

  graph
    .addNode("extract_category", extractCategory)
    .addNode("get_apis", getApis)
    .addNode("select_api", selectApi)
    .addNode("extract_parameters", extractParameters)
    .addNode("request_parameters", requestParameters)
    .addEdge("extract_category", "get_apis")
    .addEdge("get_apis", "select_api")
    .addEdge("select_api", "extract_parameters")
    .addEdge("extract_parameters", "request_parameters")
    .addEdge(START, "extract_category")
    .addEdge("request_parameters", END);

  return graph.compile();
}