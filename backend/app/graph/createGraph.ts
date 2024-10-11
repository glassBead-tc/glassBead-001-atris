import { END, START, StateGraph } from "@langchain/langgraph";
import { extractCategory } from "../tools/extract_category.js";
import { getApis } from "../tools/get_apis.js";
import { selectApi } from "../tools/select_api.js";
import { extractParameters } from "../tools/extract_parameters.js";
import { createFetchRequest } from "../tools/create_fetch_request.js";
import { GraphState } from "../types.js";
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { processApiResponse } from "../tools/process_api_response.js";
import { RunnableSequence } from "@langchain/core/runnables";

export function createGraph(llm: ChatOpenAI<ChatOpenAICallOptions>) {
  const graph = new StateGraph<GraphState>({
    channels: {
      llm: { 
        default: () => llm,
        reducer: (current, newVal) => newVal || current
      },
      query: { 
        default: () => "",
        reducer: (current, newVal) => newVal || current
      },
      categories: { 
        default: () => [],
        reducer: (current, newVal) => newVal || current
      },
      apis: { 
        default: () => [],
        reducer: (current, newVal) => newVal || current
      },
      bestApi: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      params: { 
        default: () => ({}),
        reducer: (current, newVal) => newVal || current
      },
      response: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
    },
  });

  const processApiResponseNode = processApiResponse;

  const logFinalResult = (state: GraphState) => {
    console.log("\n--- Final Result ---");
    console.log("User Query:", state.query);
    console.log("API Response:", state.response);
    console.log("--------------------\n");
    return state;
  };

  graph
    .addNode("extract_category", extractCategory)
    .addNode("get_apis", getApis)
    .addNode("select_api", selectApi)
    .addNode("extract_parameters", extractParameters)
    .addNode("create_fetch_request", createFetchRequest)
    .addNode("process_api_response", processApiResponseNode)
    .addNode("log_final_result", logFinalResult)
    .addEdge(START, "extract_category")
    .addEdge("extract_category", "get_apis")
    .addEdge("get_apis", "select_api")
    .addEdge("select_api", "extract_parameters")
    .addEdge("extract_parameters", "create_fetch_request")
    .addEdge("create_fetch_request", "process_api_response")
    .addEdge("process_api_response", "log_final_result")
    .addEdge("log_final_result", END);

  return graph.compile();
}