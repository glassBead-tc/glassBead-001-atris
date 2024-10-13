import dotenv from 'dotenv';
import { CompiledStateGraph, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { END, START } from "@langchain/langgraph";
import { extractCategory } from "../tools/extract_category.js";
import { getApis } from "../tools/get_apis.js";
import { selectApi } from "../tools/select_api.js";
import { extractParameters } from "../tools/extract_parameters.js";
import { createFetchRequest } from "../tools/create_fetch_request.js";
import { GraphState, NodeNames } from "../types.js";
import { processApiResponse } from "../tools/process_api_response.js";
import { handleMultiStepQuery } from "../tools/multi_step_queries.js";
import { logger } from '../logger.js';
import { handleEntityQuery, handleError } from './functions/handlerFunctions.js';
import { classifyQueryWrapper, wrapNodeLogic, logFinalResult } from './functions/creationHelperFunctions.js';
import { verifyParams } from '../tools/verify_params.js';

dotenv.config();

// Integrated createAtrisGraph function
function createAtrisGraph(): CompiledStateGraph<GraphState, Partial<GraphState>, NodeNames> {
  const llm = new ChatOpenAI({ 
    model: 'gpt-3.5-turbo', 
    temperature: 0, 
    apiKey: process.env.OPENAI_API_KEY 
  });

  const atris = new StateGraph<GraphState, Partial<GraphState>, NodeNames>({
    channels: {
      llm: { 
        default: () => llm,
        reducer: (current, newVal) => newVal || current
      },
      query: { 
        default: () => "",
        reducer: (current, newVal) => newVal || current
      },
      queryType: { 
        default: () => "general",
        reducer: (current, newVal) => newVal || current
      },
      categories: { 
        default: () => [],
        reducer: (current, newVal) => newVal.length > 0 ? newVal : current
      },
      apis: { 
        default: () => [],
        reducer: (current, newVal) => newVal.length > 0 ? newVal : current
      },
      response: { 
        default: () => "",
        reducer: (current, newVal) => newVal || current
      },
      formattedResponse: { 
        default: () => "",
        reducer: (current, newVal) => newVal || current
      },
      error: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      multiStepHandled: { 
        default: () => false,
        reducer: (current, newVal) => newVal !== undefined ? newVal : current
      },
      complexity: { 
        default: () => "simple",
        reducer: (current, newVal) => newVal || current
      },
      message: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      bestApi: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      params: { 
        default: () => ({}),
        reducer: (current, newVal) => (Object.keys(newVal).length > 0) ? newVal : current
      },
      entityType: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      entity: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      }
      // Add other necessary state properties here
    }
  })
    .addNode("classify_query", wrapNodeLogic("classify_query", classifyQueryWrapper))
    .addNode("extract_category", wrapNodeLogic("extract_category", extractCategory))
    .addNode("get_apis", wrapNodeLogic("get_apis", getApis))
    .addNode("select_api", wrapNodeLogic("select_api", selectApi))
    .addNode("handle_multi_step_query", wrapNodeLogic("handle_multi_step_query", handleMultiStepQuery))
    .addNode("handle_entity_query", wrapNodeLogic("handle_entity_query", handleEntityQuery))
    .addNode("extract_parameters", wrapNodeLogic("extract_parameters", extractParameters))
    .addNode("verify_params", wrapNodeLogic("verify_params", verifyParams))
    .addNode("create_fetch_request", wrapNodeLogic("create_fetch_request", createFetchRequest))
    .addNode("process_api_response", wrapNodeLogic("process_api_response", processApiResponse))
    .addNode("handle_error", wrapNodeLogic("handle_error", handleError))
    .addNode("log_final_result", wrapNodeLogic("log_final_result", logFinalResult))
    .addConditionalEdges({
      source: "classify_query",
      path: (state: GraphState) => state.error ? "handle_error" : "extract_category"
    })
    .addConditionalEdges({
      source: "extract_category",
      path: (state: GraphState) => state.error ? "handle_error" : "get_apis"
    })
    .addConditionalEdges({
      source: "get_apis",
      path: (state: GraphState) => state.error ? "handle_error" : "select_api"
    })
    .addConditionalEdges({
      source: "select_api",
      path: (state: GraphState) => state.error ? "handle_error" : "extract_parameters"
    })
    .addConditionalEdges({
      source: "extract_parameters",
      path: (state: GraphState) => state.error ? "handle_error" : "verify_params"
    })
    .addConditionalEdges({
      source: "verify_params",
      path: (state: GraphState) => state.error ? "handle_error" : "create_fetch_request"
    })
    .addConditionalEdges({
      source: "create_fetch_request",
      path: (state: GraphState) => state.error ? "handle_error" : "process_api_response"
    })
    .addConditionalEdges({
      source: "process_api_response",
      path: (state: GraphState) => {
        logger.debug(`process_api_response - multiStepHandled: ${state.multiStepHandled}`);
        if (state.error) return "handle_error";
        if (state.complexity === 'simple') return "log_final_result";
        if (!state.multiStepHandled) return "handle_multi_step_query";
        return "log_final_result"; // Terminate after handling multi-step
      }
    })
    .addConditionalEdges({
      source: "handle_multi_step_query",
      path: (state: GraphState) => {
        logger.debug(`handle_multi_step_query - Current State: ${JSON.stringify(state)}`);
        return state.error ? "handle_error" : "process_api_response";
      }
    })
    .addConditionalEdges({
      source: "handle_entity_query",
      path: (state: GraphState) => state.error ? "handle_error" : "process_api_response"
    })
    .addEdge("handle_error", "log_final_result")
    .addEdge("log_final_result", END);

  // Connect START to the first node
  atris.addEdge(START, "classify_query");

  // Compile the graph before returning
  return atris.compile();
}

export function createAtris() {
  logger.info("====== CREATING atris WITH LATEST CHANGES ======");

  const atris = createAtrisGraph();

  return atris;
}

// If you need to export it as createGraph:
export { createAtris as createGraph };