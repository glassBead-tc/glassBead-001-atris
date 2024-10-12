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
  console.log("Entering verifyParams function"); // Add this line
  logger.debug("Entering verifyParams function");
  const missingParams = Object.keys(state.params)
    .filter(param => !state.params[param] && param !== 'query');
  if (missingParams.length > 0) {
    logger.info("Additional information needed to answer the question accurately.");
    logger.debug(`Missing parameters: ${missingParams.join(', ')}`);

    // Check if we're in an environment where we can get user input
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
        // Optionally, set a default value or leave it undefined
        // state.params[param] = 'default_value';
      }
    }

    logger.info("Parameter verification completed.");
  } else {
    logger.debug("No missing parameters, skipping verification.");
  }
  return state;
};

const handleError = (state: GraphState): GraphState => {
  console.error("Error in graph execution:");
  console.error("Error message:", state.error);
  console.error("Current state:", JSON.stringify(state, null, 2));
  state.formattedResponse = "I'm sorry, but I encountered an error while processing your request. Could you please try rephrasing your question?";
  return state;
};

export function createGraph(llm: ChatOpenAI) {
  console.log("====== CREATING GRAPH WITH LATEST CHANGES ======");
  type NodeNames = 
    | "extract_category"
    | "get_apis"
    | "select_api"
    | "handle_multi_step_query"
    | "extract_parameters"
    | "verify_params"
    | "create_fetch_request"
    | "process_api_response"
    | "handle_error"
    | "log_final_result";

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
        default: () => undefined,
        reducer: (current, newVal) => newVal || current
      },
      error: {
        default: () => undefined,
        reducer: (current, newVal) => newVal || current
      },
    },
  });

  const logFinalResult = (state: GraphState): GraphState => {
    if (state.formattedResponse) {
      logger.info("Query processed successfully.");
      logger.debug(`Final response: ${state.formattedResponse}`);
    } else {
      logger.warn("No formatted response found for the query.");
    }
    return state;
  };

  graph
    .addNode("extract_category", async (state) => {
      logger.info("Entering extract_category");
      try {
        return await extractCategory(state);
      } catch (error: unknown) {
        logger.error(`Error in extract_category: ${error instanceof Error ? error.message : String(error)}`);
        state.error = error instanceof Error ? error.message : 'Unknown error in extract_category';
        return state;
      }
    })
    .addNode("get_apis", async (state) => {
      try {
        return await getApis(state);
      } catch (error: unknown) {
        logger.error(`Error in get_apis: ${error instanceof Error ? error.message : String(error)}`);
        logger.debug(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
        state.error = error instanceof Error ? error.message : 'Unknown error in get_apis';
        return state;
      }
    })
    .addNode("select_api", async (state) => {
      try {
        return await selectApi(state);
      } catch (error: unknown) {
        logger.error(`Error in select_api: ${error instanceof Error ? error.message : String(error)}`);
        logger.debug(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
        state.error = error instanceof Error ? error.message : 'Unknown error in select_api';
        return state;
      }
    })
    .addNode("handle_multi_step_query", async (state) => {
      try {
        return await handleMultiStepQuery(state);
      } catch (error: unknown) {
        logger.error(`Error in handle_multi_step_query: ${error instanceof Error ? error.message : String(error)}`);
        logger.debug(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
        state.error = error instanceof Error ? error.message : 'Unknown error in handle_multi_step_query';
        return state;
      }
    })
    .addNode("extract_parameters", async (state) => {
      try {
        return await extractParameters(state);
      } catch (error: unknown) {
        logger.error(`Error in extract_parameters: ${error instanceof Error ? error.message : String(error)}`);
        logger.debug(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
        state.error = error instanceof Error ? error.message : 'Unknown error in extract_parameters';
        return state;
      }
    })
    .addNode("verify_params", async (state) => {
      console.log("Calling verifyParams"); // Add this line
      try {
        return await verifyParams(state);
      } catch (error: unknown) {
        logger.error(`Error in verify_params: ${error instanceof Error ? error.message : String(error)}`);
        logger.debug(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
        state.error = error instanceof Error ? error.message : 'Unknown error in verify_params';
        return state;
      }
    })
    .addNode("create_fetch_request", async (state) => {
      logger.debug(`Entering create_fetch_request with state: ${JSON.stringify(state, null, 2)}`);
      try {
        const result = await createFetchRequest(state);
        logger.debug(`create_fetch_request result: ${JSON.stringify(result, null, 2)}`);
        return result;
      } catch (error: unknown) {
        logger.error(`Error in create_fetch_request: ${error instanceof Error ? error.message : String(error)}`);
        logger.debug(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
        state.error = error instanceof Error ? error.message : 'Unknown error in create_fetch_request';
        if (error === null) {
          logger.error('Received null error in create_fetch_request');
          state.error = 'Unexpected null error in create_fetch_request';
        }
        return state;
      }
    })
    .addNode("process_api_response", async (state) => {
      console.log("Before processApiResponse - State:", JSON.stringify(state, null, 2));
      try {
        const result = await processApiResponse(state);
        console.log("After processApiResponse - Result:", JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error("Error in process_api_response node:", error);
        return state;
      }
    })
    .addNode("handle_error", handleError)
    .addNode("log_final_result", logFinalResult);

  // Define conditional edges for error handling
  graph
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
      path: (state: GraphState) => state.error ? "handle_error" : "handle_multi_step_query"
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
    .addEdge("handle_error", "log_final_result");

  // Modify the main flow
  graph
    .addEdge(START, "extract_category")
    .addEdge("log_final_result", END);

  return graph.compile();
}
