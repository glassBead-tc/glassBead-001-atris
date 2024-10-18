import { GraphState } from './types.js';
import { ClassifyQueryTool } from './tools/CategorizeQueryTool.js';
import { ExtractCategoryTool } from './tools/extractCategoryTool.js';
import { GetApisTool } from './tools/GetApisTool.js';
import { ExtractParametersTool } from './tools/ExtractParametersTool.js';
// Import other tools as needed
import { logger } from './logger.js';

/**
 * Orchestrates the execution of tools based on the user's query.
 * @param initialState - The initial GraphState containing the user's query and LLM instance.
 * @returns The updated GraphState after executing all tools.
 */
export async function executeTools(initialState: GraphState): Promise<GraphState> {
  let state = { ...initialState };

  try {
    // Classify the query
    const classifyQueryTool = new ClassifyQueryTool();
    const classificationResult = await classifyQueryTool._call({ state });
    state = { ...state, ...classificationResult };

    // Extract category
    const extractCategoryTool = new ExtractCategoryTool();
    const categoryResult = await extractCategoryTool._call({ state });
    state = { ...state, ...categoryResult };

    // Get APIs
    const getApisTool = new GetApisTool();
    const apisResult = await getApisTool._call({ state });
    state = { ...state, ...apisResult };

    // Extract parameters
    const extractParametersTool = new ExtractParametersTool();
    const parametersResult = await extractParametersTool._call({ state });
    state = { ...state, ...parametersResult };

    // Verify parameters (if you have a VerifyParamsTool)
    // const verifyParamsTool = new VerifyParamsTool();
    // const verifyParamsResult = await verifyParamsTool._call({ state });
    // state = { ...state, ...verifyParamsResult };

    // Continue with other tools as needed
    // For example, select API, execute API call, process response, etc.

    // Example: Execute API Call Tool
    // const executeApiCallTool = new ExecuteApiCallTool();
    // const apiCallResult = await executeApiCallTool._call({ state });
    // state = { ...state, ...apiCallResult };

    // Process API Response
    // const processApiResponseTool = new ProcessApiResponseTool();
    // const apiResponseResult = await processApiResponseTool._call({ state });
    // state = { ...state, ...apiResponseResult };

    // Handle the final result or any errors
    if (state.error) {
      logger.error(`Error after executing tools: ${state.message}`);
      // You might want to format the error message or perform additional error handling here
    } else {
      logger.info('Successfully executed all tools.');
    }
  } catch (error: unknown) {
    logger.error('Unexpected error in executeTools:', error);
    state.error = true;
    state.message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  }

  return state;
}
