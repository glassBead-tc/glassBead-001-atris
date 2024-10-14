import dotenv from 'dotenv'; // Manage environment variables
import { CompiledStateGraph, StateGraph } from "@langchain/langgraph"; // LangGraph classes for state graph creation
import { ChatOpenAI } from "@langchain/openai"; // Language model interactions
import { END, START } from "@langchain/langgraph"; // Constants for graph flow control

// Importing custom utility functions for various tasks within the graph
import { extractCategory } from "../tools/extract_category.js"; // Extracts category information from queries
import { getApis } from "../tools/get_apis.js"; // Retrieves available APIs based on query
import { selectApi } from "../tools/select_api.js"; // Selects the most suitable API for the query
import { extractParameters } from "../tools/extract_parameters.js"; // Extracts necessary parameters from user queries
import { createFetchRequest } from "../tools/create_fetch_request.js"; // Creates API fetch requests

// Importing custom types for GraphState and NodeNames
import { GraphState, NodeNames } from "../types.js"; // Defines the shape of the graph's state and node names

// Importing additional tools for processing API responses and handling multi-step queries
import { processApiResponse } from "../tools/process_api_response.js"; // Processes responses received from APIs
import { handleMultiStepQuery } from "../tools/multi_step_queries.js"; // Handles multi-step queries requiring additional processing

// Importing a custom logger for logging purposes
import { logger } from '../logger.js'; // Logs information and errors for debugging

// Importing various handler functions responsible for different query types
import { 
  handle_entity_query, 
  handle_error, 
  handle_playlist_info, 
  handle_search_tracks, 
  handle_search_playlists,
  handle_search_users,
  handle_trending_tracks,
  handle_search_genres // Newly added handler for genre searches
} from './functions/handlerFunctions.js'; // Handles specific types of queries

// Importing helper functions for query classification and node logic wrapping
import { classifyQueryWrapper, wrapNodeLogic, log_final_result } from './functions/creationHelperFunctions.js'; // Assists in classifying queries and wrapping node logic

// Importing a function to verify parameters passed in queries
import { verifyParams } from '../tools/verify_params.js'; // Verifies the integrity of extracted parameters

// Configuring dotenv to load environment variables from a .env file
dotenv.config(); // Loads environment variables for configuration

/**
 * Creates and compiles the Atris StateGraph.
 * @returns {CompiledStateGraph<GraphState, Partial<GraphState>, NodeNames>} The compiled state graph ready for execution.
 */
function createAtrisGraph(): CompiledStateGraph<GraphState, Partial<GraphState>, NodeNames> {
  // Initializing the ChatOpenAI instance with specified model and API key from environment variables
  const llm = new ChatOpenAI({ 
    model: 'gpt-3.5-turbo', 
    temperature: 0, 
    apiKey: process.env.OPENAI_API_KEY // OpenAI API key from environment variables
  });

  // Creating a new StateGraph instance with defined state channels, their default values, and reducers
  const atris = new StateGraph<GraphState, Partial<GraphState>, NodeNames>({
    channels: {
      llm: { 
        default: () => llm, 
        reducer: (current, newVal) => newVal || current 
      },
      query: { 
        default: () => "", 
        reducer: (current, newVal) => newVal !== "" ? newVal : current 
      },
      queryType: { 
        default: () => "general", 
        reducer: (current, newVal) => newVal || current 
      },
      categories: { 
        default: () => [], 
        reducer: (current, newVal) => newVal.length ? newVal : current 
      },
      apis: { 
        default: () => [], 
        reducer: (current, newVal) => newVal.length ? newVal : current 
      },
      bestApi: { 
        default: () => null, 
        reducer: (current, newVal) => newVal || current 
      },
      params: { 
        default: () => ({}), 
        reducer: (current, newVal) => ({ ...current, ...newVal }) 
      },
      response: { 
        default: () => null, 
        reducer: (current, newVal) => newVal !== null ? newVal : current 
      },
      secondaryApi: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      secondaryResponse: {
        default: () => null,
        reducer: (current, newVal) => newVal !== null ? newVal : current
      },
      error: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      formattedResponse: {
        default: () => "",
        reducer: (current, newVal) => newVal || current
      },
      message: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      isEntityQuery: {
        default: () => false,
        reducer: (current, newVal) => newVal !== undefined ? newVal : current
      },
      entityType: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      entity: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      parameters: {
        default: () => ({}),
        reducer: (current, newVal) => ({ ...current, ...newVal })
      },
      complexity: {
        default: () => "simple",
        reducer: (current, newVal) => newVal || current
      },
      multiStepHandled: {
        default: () => false,
        reducer: (current, newVal) => newVal !== undefined ? newVal : current
      },
      initialState: {
        default: () => undefined,
        reducer: (current, newVal) => newVal || current
      }
    }
  });

  // Building the graph by adding nodes and defining their logic
  atris
    .addNode("classify_query", wrapNodeLogic("classify_query", classifyQueryWrapper))
    .addNode("handle_search_tracks", wrapNodeLogic("handle_search_tracks", handle_search_tracks))
    .addNode("handle_trending_tracks", wrapNodeLogic("handle_trending_tracks", handle_trending_tracks))
    .addNode("handle_search_playlists", wrapNodeLogic("handle_search_playlists", handle_search_playlists))
    .addNode("handle_search_users", wrapNodeLogic("handle_search_users", handle_search_users))
    .addNode("handle_search_genres", wrapNodeLogic("handle_search_genres", handle_search_genres))
    .addNode("handle_entity_query", wrapNodeLogic("handle_entity_query", handle_entity_query))
    .addNode("handle_playlist_info", wrapNodeLogic("handle_playlist_info", handle_playlist_info))
    .addNode("handle_multi_step_query", wrapNodeLogic("handle_multi_step_query", handleMultiStepQuery))
    .addNode("handle_error", wrapNodeLogic("handle_error", handle_error))
    .addNode("log_final_result", wrapNodeLogic("log_final_result", log_final_result))

    // Defining transitions from 'classify_query' node based on the classification result
    .addConditionalEdges({
      source: "classify_query",
      path: (state: GraphState) => {
        logger.debug(`Determining next node based on queryType: ${state.queryType}`);
        switch (state.queryType) {
          case 'search_tracks':
            return "handle_search_tracks";
          case 'trending_tracks':
            return "handle_trending_tracks";
          case 'search_playlists':
            return "handle_search_playlists";
          case 'search_users':
            return "handle_search_users";
          case 'search_genres':
            return "handle_search_genres";
          case 'entity_query':
            return "handle_entity_query";
          case 'playlist_info':
            return "handle_playlist_info";
          default:
            return "handle_error";
        }
      }
    })
    // Defining transitions from each handler node based on error presence
    .addConditionalEdges({
      source: "handle_search_tracks",
      path: (state: GraphState) => {
        return state.error ? "handle_error" : "log_final_result";
      }
    })
    .addConditionalEdges({
      source: "handle_trending_tracks",
      path: (state: GraphState) => {
        return state.error ? "handle_error" : "log_final_result";
      }
    })
    .addConditionalEdges({
      source: "handle_search_playlists",
      path: (state: GraphState) => {
        return state.error ? "handle_error" : "log_final_result";
      }
    })
    .addConditionalEdges({
      source: "handle_search_users",
      path: (state: GraphState) => {
        return state.error ? "handle_error" : "log_final_result";
      }
    })
    .addConditionalEdges({
      source: "handle_search_genres",
      path: (state: GraphState) => {
        return state.error ? "handle_error" : "log_final_result";
      }
    })
    .addConditionalEdges({
      source: "handle_entity_query",
      path: (state: GraphState) => {
        return state.error ? "handle_error" : "log_final_result";
      }
    })
    .addConditionalEdges({
      source: "handle_playlist_info",
      path: (state: GraphState) => {
        return state.error ? "handle_error" : "log_final_result";
      }
    })
    .addConditionalEdges({
      source: "handle_multi_step_query",
      path: (state: GraphState) => {
        return state.error ? "handle_error" : "log_final_result";
      }
    })
    // Directly connecting error handling to logging the final result
    .addEdge("handle_error", "log_final_result")
    // Connecting the final logging node to the END node to terminate the graph flow
    .addEdge("log_final_result", END);

  // Connecting the START node to the 'classify_query' node to initiate query processing
  atris.addEdge(START, "classify_query");

  // Compiling the defined state graph into a format ready for execution
  return atris.compile();
}

/**
 * Creates the Atris StateGraph and logs the creation process.
 * @returns {CompiledStateGraph<GraphState, Partial<GraphState>, NodeNames>} The compiled state graph ready for use.
 */
export function createAtris(): CompiledStateGraph<GraphState, Partial<GraphState>, NodeNames> {
  logger.info("====== CREATING ATRIS WITH LATEST CHANGES ======");
  const atris = createAtrisGraph();
  return atris;
}

// Exporting 'createAtris' as 'createGraph' to ensure compatibility with LangGraph Studio
export { createAtris as createGraph };
