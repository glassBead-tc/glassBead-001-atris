import dotenv from 'dotenv';
import { END, START, StateGraph } from "@langchain/langgraph";
import { extractCategory } from "../tools/extract_category.js";
import { getApis } from "../tools/get_apis.js";
import { selectApi } from "../tools/select_api.js";
import { extractParameters } from "../tools/extract_parameters.js";
import { createFetchRequest } from "../tools/create_fetch_request.js";
import { GraphState } from "../types.js";
import { ChatOpenAI } from "@langchain/openai";
import { processApiResponse } from "../tools/process_api_response.js";
import { handleMultiStepQuery } from "../tools/multi_step_queries.js";
import { logger } from '../logger.js';
import readline from 'readline';
import { classifyQuery, QueryClassification } from "../modules/queryClassifier.js";

dotenv.config();

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const TIMEOUT = 30000; // 30 seconds

const getUserInput = async (prompt: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const verifyParams = async (state: GraphState): Promise<GraphState> => {
  logger.debug("Entering verifyParams function");
  const missingParams = Object.keys(state.params)
    .filter(param => !state.params[param] && param !== 'query');
  if (missingParams.length > 0) {
    logger.info("Additional information needed to answer the question accurately.");
    logger.debug(`Missing parameters: ${missingParams.join(', ')}`);

    const canGetUserInput = process.env.NODE_ENV !== 'test' && process.env.ALLOW_USER_INPUT === 'true';
    logger.debug(`Can get user input: ${canGetUserInput}`);

    for (const param of missingParams) {
      if (canGetUserInput) {
        let isValidInput = false;
        while (!isValidInput) {
          try {
            const userInput = await getUserInput(`Can you please provide ${param}? (Press Enter to skip): `);
            logger.debug(`User input for ${param}: ${userInput}`);
            if (userInput.trim() === "") {
              logger.debug(`User skipped providing ${param}.`);
              isValidInput = true;
            } else {
              state.params[param] = userInput.trim();
              isValidInput = true;
            }
          } catch (error) {
            logger.warn(`Error getting user input for ${param}: ${error}`);
            isValidInput = true; // Break the loop if we can't get user input
          }
        }
      } else {
        logger.debug(`Skipping user input for ${param} in current environment.`);
      }
    }

    logger.info("Parameter verification completed.");
  } else {
    logger.debug("No missing parameters, skipping verification.");
  }
  return state;
};

const handleError = async (state: GraphState): Promise<GraphState> => {
  logger.debug("Entering handleError function");
  state.formattedResponse = `I apologize, but an error occurred: ${state.error}. Please try rephrasing your question or providing more specific information.`;
  return state;
};

const handleEntityQuery = async (state: GraphState): Promise<GraphState> => {
  logger.info(`Handling entity query: ${state.query}`);
  const entityType = state.entityType;
  const entity = state.entity;

  if (!entityType) {
    logger.warn("No entity type extracted from the query");
    return {
      ...state,
      error: "Unable to determine the type of information you're looking for. Please be more specific."
    };
  }

  // If we have an entityType but no specific entity, we can still proceed
  if (!entity) {
    logger.info(`No specific entity extracted, but entityType is ${entityType}`);
    // For 'trending_tracks', we don't need a specific entity
    if (state.queryType === 'trending_tracks') {
      return {
        ...state,
        params: { limit: 5 }, // Default to top 5 tracks
        categories: ['Tracks', 'Discovery'] // Add relevant categories for trending tracks
      };
    }
  }

  // If we reach here, we either have both entityType and entity, or we need a specific entity
  if (!entity) {
    logger.warn(`Entity type ${entityType} requires a specific entity, which was not provided`);
    return {
      ...state,
      error: `Please provide a specific ${entityType} to search for.`
    };
  }

  state.params = { query: entity, limit: 1 };

  // Set categories based on entityType
  switch (entityType) {
    case 'track':
      state.categories = ['Tracks'];
      break;
    case 'user':
      state.categories = ['Users'];
      break;
    case 'playlist':
      state.categories = ['Playlists'];
      break;
    default:
      state.categories = [];
  }

  // Log the state before returning
  logger.debug(`State after handleEntityQuery: ${JSON.stringify(state)}`);
  return state;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};

const withRetry = async <T>(fn: () => Promise<T>, maxRetries: number, delay: number): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      logger.warn(`Retry ${i + 1}/${maxRetries} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
};

const get_apis = async (state: GraphState): Promise<GraphState> => {
  logger.debug(`State before getApis: ${JSON.stringify(state)}`);
  const result = await getApis(state);
  logger.debug(`Result from getApis: ${JSON.stringify(result)}`);
  const newState = { ...state, ...result };
  logger.debug(`New state after getApis: ${JSON.stringify(newState)}`);
  return newState;
};

const logFinalResult = async (state: GraphState): Promise<Partial<GraphState>> => {
  logger.info(`Final result: ${state.formattedResponse}`);
  return state;
};

export function createGraph() {
  logger.info("====== CREATING GRAPH WITH LATEST CHANGES ======");
  const llm = new ChatOpenAI({ model: 'gpt-3.5-turbo', temperature: 0, apiKey: process.env.OPENAI_API_KEY });

  type NodeNames = 
    | "extract_category"
    | "get_apis"
    | "select_api"
    | "handle_multi_step_query"
    | "handle_entity_query"
    | "extract_parameters"
    | "verify_params"
    | "create_fetch_request"
    | "process_api_response"
    | "handle_error"
    | "log_final_result"
    | "classify_query";

  const graph = new StateGraph<GraphState, Partial<GraphState>, NodeNames>({
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
        reducer: (current, newVal) => ({...current, ...newVal})
      },
      response: { 
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      formattedResponse: {
        default: () => undefined,
        reducer: (current, newVal) => newVal || current
      },
      message: {
        default: () => null,
        reducer: (current, newVal) => newVal || current
      },
      error: {
        default: () => undefined,
        reducer: (current, newVal) => newVal || current
      },
      isEntityQuery: {
        default: () => false,
        reducer: (current, newVal) => newVal || current
      },
      entityType: {
        default: () => null,
        reducer: (current: GraphState['entityType'], newVal: GraphState['entityType']) => newVal || current
      },
      entity: {
        default: () => null,
        reducer: (current: GraphState['entity'], newVal: GraphState['entity']) => newVal || current
      },
    },
  });

  const classifyQueryWrapper = async (state: GraphState): Promise<Partial<GraphState>> => {
    const classification = await classifyQuery(state.query);
    return {
      queryType: classification.type,
      isEntityQuery: classification.isEntityQuery,
      entityType: classification.entityType,
      entity: classification.entity
    };
  };

  const wrapNodeLogic = (nodeName: string, logic: (state: GraphState) => Promise<Partial<GraphState>> | Partial<GraphState>) => {
    return async (state: GraphState): Promise<GraphState> => {
      logger.debug(`Entering ${nodeName} node`);
      try {
        const result = await withTimeout(withRetry(async () => {
          const logicResult = logic(state);
          return logicResult instanceof Promise ? await logicResult : logicResult;
        }, MAX_RETRIES, RETRY_DELAY), TIMEOUT);
        return { ...state, ...result };
      } catch (error) {
        logger.error(`Error in ${nodeName}: ${error instanceof Error ? error.message : String(error)}`);
        return { 
          ...state, 
          error: error instanceof Error ? error.message : `Unknown error in ${nodeName}`
        };
      }
    };
  };

  graph
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
    .addNode("log_final_result", wrapNodeLogic("log_final_result", logFinalResult));

  // Define conditional edges for error handling and flow control
  graph
    .addConditionalEdges({
      source: "classify_query",
      path: (state) => {
        if (state.isEntityQuery) {
          return "handle_entity_query";
        } else {
          return "extract_category";
        }
      }
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
      path: (state: GraphState) => {
        if (state.error) return "handle_error";
        if (state.isEntityQuery) return "extract_parameters"; // Proceed to next step
        return "handle_multi_step_query";
      }
    })
    .addConditionalEdges({
      source: "handle_entity_query",
      path: (state: GraphState) => state.error ? "handle_error" : "get_apis" // Route through get_apis for entity queries
    })
    .addConditionalEdges({
      source: "handle_multi_step_query",
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
      path: (state: GraphState) => state.error ? "handle_error" : "log_final_result"
    })
    .addEdge("handle_error", "log_final_result")
    .addEdge("log_final_result", END);

  graph.addEdge(START, "classify_query");

  return graph.compile();
}