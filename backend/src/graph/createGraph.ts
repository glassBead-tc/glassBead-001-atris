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
        reducer: (current: ChatOpenAI<ChatOpenAICallOptions>, newVal: ChatOpenAI<ChatOpenAICallOptions>) => newVal || current
      },
      query: { 
        default: () => "",
        reducer: (current: string, newVal: string) => newVal || current
      },
      categories: { 
        default: () => [],
        reducer: (current: string[], newVal: string[]) => newVal.length > 0 ? newVal : current
      },
      apis: { 
        default: () => [],
        reducer: (current: DatasetSchema[], newVal: DatasetSchema[]) => newVal.length > 0 ? newVal : current
      },
      bestApi: { 
        default: () => ({ parameters: {} } as DatasetSchema & { parameters: Record<string, any> }),
        reducer: (
          current: (DatasetSchema & { parameters: Record<string, any> }) | undefined, 
          newVal: (DatasetSchema & { parameters: Record<string, any> }) | undefined
        ): DatasetSchema & { parameters: Record<string, any> } | undefined => {
          if (newVal?.api_name) {
            return newVal;
          }
          return current ?? ({ parameters: {} } as DatasetSchema & { parameters: Record<string, any> });
        }
      },
      params: { 
        default: () => ({}),
        reducer: (current: Record<string, string>, newVal: Record<string, string>) => Object.keys(newVal).length > 0 ? newVal : current
      },
      response: { 
        default: () => ({}),
        reducer: (current: any, newVal: any) => newVal !== null && newVal !== undefined ? newVal : current
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