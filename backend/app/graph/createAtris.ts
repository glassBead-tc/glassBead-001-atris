import dotenv from 'dotenv';
import { CompiledStateGraph, StateGraph, LangGraphRunnableConfig, StateType, StateDefinition } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { END, START } from "@langchain/langgraph";
import { GraphState, NodeNames } from "../types.js"; // Updated import
import { logger } from '../logger.js';
import { 
  handle_entity_query, 
  handle_playlist_info, 
  handle_search_tracks, 
  handle_search_playlists,
  handle_search_users,
  handle_trending_tracks,
  handle_search_genres // Newly added handler for genre searches
} from './nodes/handlerFunctions.js';
import { log_final_result } from './functions/creationHelperFunctions.js';
import { ExtractCategoryTool } from '../tools/ExtractCategoryTool.js';
import { categorizeQuery, CategorizeQueryTool } from '../tools/CategorizeQueryTool.js';
import { VerifyParamsTool, verifyParams } from '../tools/VerifyParamsTool.js';
import { ExtractParametersTool, extractParameters } from '../tools/ExtractParametersTool.js';
import { ExtractHighLevelCategoriesTool, extractHighLevelCategories } from '../tools/ExtractHighLevelCategoriesTool.js';
import { GetApisTool, getApis } from '../tools/GetApisTool.js';
import { selectApi, SelectApiTool } from '../tools/SelectApiTool.js';
import { CreateFetchRequestTool, createFetchRequest } from '../tools/CreateFetchRequestTool.js';
import { ProcessApiResponseTool, processApiResponse } from '../tools/ProcessApiResponseTool.js';
import { handle_multi_step_query } from '../tools/node_tools/index.js';
import { extractParameters } from '../tools/node_tools/extract_parameters.js';
import { verifyParams } from '../tools/node_tools/verify_params.js';

dotenv.config();

/**
 * Creates the Atris StateGraph.
 * @returns {CompiledStateGraph<GraphState, GraphState>} The compiled state graph ready for use.
 */
function createAtrisGraph(): CompiledStateGraph<GraphState, GraphState> {
  const llm = new ChatOpenAI({ 
    model: 'gpt-3.5-turbo', 
    temperature: 0, 
    apiKey: process.env.OPENAI_API_KEY!
  });

  // Initialize StateGraph
  const graph = new StateGraph<GraphState>({
    channels: {
      // Line 39-42: Defining the 'llm' channel with a default ChatOpenAI instance and a reducer to maintain its state
      llm: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      // Line 43-46: Defining the 'query' channel to hold the user's query with a default empty string
      query: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      // Line 47-50: Defining the 'queryType' channel to classify the type of query, defaulting to 'general'
      queryType: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      // Line 51-54: Defining the 'categories' channel to store extracted categories from the query
      categories: { 
        default: () => null,
        reducer: (current, newVal) => newVal.length > 0 ? newVal : current
      },
      // Line 55-58: Defining the 'apis' channel to store available APIs based on the query
      apis: { 
        default: () => null,
        reducer: (current, newVal) => newVal.length > 0 ? newVal : current
      },
      params: { 
        default: () => null,
        reducer: (current, newVal) => (Object.keys(newVal).length > 0) ? newVal : current
      },
      response: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      // Line 80-82: Defining the 'complexity' channel to assess query complexity, defaulting to 'simple'
      complexity: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      // Line 83-85: Defining the 'message' channel to hold any messages or errors, defaulting to null
      message: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      // Line 87-89: Defining the 'bestApi' channel to store the selected best API for the query
      bestApi: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      entityType: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      entityName: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      entity: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      // Line 103-105: Defining the 'error' channel to indicate if an error has occurred
      error: {
        default: () => null,
        reducer: (current, newVal) => newVal
      },
      isEntityQuery: {
        default: () => null,
        reducer: (current, newVal) => newVal
      },
      parameters: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      secondaryApi: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      secondaryResponse: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      multiStepHandled: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      initialState: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      }
    }
  })
  .addNode("categorize_query", categorizeQuery)
  .addNode("extract_category", extractCategory)
  .addNode("get_apis", getApis)
  .addNode("select_api", selectApi)
  .addNode("extract_parameters", extractParameters)
  .addNode("verify_params", verifyParams)
  .addNode("create_fetch_request", createFetchRequest)
  .addNode("process_api_response", processApiResponse)
  .addNode("format_response", formatResponse)
  .addNode("handle_error", handleError)
  .addNode("log_final_result", log_final_result)
  .addNode("process_entity_queries", processEntityQueries)
  .addNode("extract_high_level_categories", extractHighLevelCategories)
  .addNode("handle_search_tracks", handle_search_tracks)
  .addNode("handle_trending_tracks", handle_trending_tracks)
  .addNode("handle_search_playlists", handle_search_playlists)
  .addNode("handle_search_users", handle_search_users)
  .addNode("handle_search_genres", handle_search_genres)
  .addNode("handle_entity_query", handle_entity_query)
  .addNode("handle_playlist_info", handle_playlist_info)  // Added this line
  .addNode("handle_multi_step_query", handle_multi_step_query);

  // Defining conditional transitions based on queryType
  graph.addConditionalEdges({
    source: "categorize_query",
    path: (state: GraphState): NodeNames => {
      if (state.error) return "log_final_result";
      switch (state.queryType) {
        case 'search_tracks': return "handle_search_tracks";
        case 'trending_tracks': return "handle_trending_tracks";
        case 'search_playlists': return "handle_search_playlists";
        case 'search_users': return "handle_search_users";
        case 'search_genres': return "handle_search_genres";
        case 'entity_query': return "handle_entity_query";
        case 'playlist_info': return "handle_playlist_info";
        case 'genre_info': return "handle_multi_step_query";
        case 'general':
        default: return "log_final_result";
      }
    }
  });

  // Defining transitions from each handler node based on error presence
  graph.addConditionalEdges({
    source: "handle_search_tracks",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "log_final_result"
  })
  .addConditionalEdges({
    source: "handle_trending_tracks",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "log_final_result"
  })
  .addConditionalEdges({
    source: "handle_search_playlists",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "log_final_result"
  })
  .addConditionalEdges({
    source: "handle_search_users",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "log_final_result"
  })
  .addConditionalEdges({
    source: "handle_search_genres",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "log_final_result"
  })
  .addConditionalEdges({
    source: "handle_entity_query",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "log_final_result"
  })
  .addConditionalEdges({
    source: "handle_playlist_info",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "log_final_result"
  })
  .addConditionalEdges({
    source: "handle_multi_step_query",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "log_final_result"
  })
  .addConditionalEdges({
    source: "extract_category",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "get_apis"
  })
  .addConditionalEdges({
    source: "get_apis",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "select_api"
  })
  .addConditionalEdges({
    source: "select_api",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "extract_parameters"
  })
  .addConditionalEdges({
    source: "extract_parameters",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "verify_params"
  })
  .addConditionalEdges({
    source: "verify_params",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "create_fetch_request"
  })
  .addConditionalEdges({
    source: "create_fetch_request",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "process_api_response"
  })
  .addConditionalEdges({
    source: "process_api_response",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "format_response"
  })
  .addConditionalEdges({
    source: "format_response",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "handle_error"
  })
  .addConditionalEdges({
    source: "handle_error",
    path: (state: GraphState): NodeNames => 
      state.error ? "log_final_result" : "log_final_result"
  });

  // Connecting the final logging node to the END node to terminate the graph flow
  graph.addEdge("log_final_result", END);

  // Connecting the START node to the 'classify_query' node to initiate query processing
  graph.addEdge(START, "classify_query");

  // Compiling the defined state graph into a format ready for execution
  const atris = graph.compile() as CompiledStateGraph<GraphState, GraphState>;
  return atris;
}

/**
 * Creates the Atris StateGraph and logs the creation process.
 * @returns {CompiledStateGraph<GraphState, GraphState>} The compiled state graph ready for use.
 */
export function createAtris(): CompiledStateGraph<GraphState, GraphState> {
  logger.info("====== CREATING ATRIS WITH LATEST CHANGES ======");
  const atris = createAtrisGraph();
  return atris;
}

// Exporting 'createAtris' as 'createGraph' to ensure compatibility with LangGraph Studio
export { createAtris as createGraph };
