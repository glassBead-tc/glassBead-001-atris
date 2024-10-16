import { executeApiCall } from "./create_fetch_request.js";
import { extractParameters } from "./extract_parameters.js";
import { extractCategory } from "./extract_category.js";
import { handleMultiStepQuery } from "./multi_step_queries.js";
import { selectApi } from "./select_api.js";
import { verifyParams } from "./verify_params.js";
import { getApis } from "./get_apis.js";
import { ExtractHighLevelCategories } from "./extract_high_level_categories.js";
import * as processEntityQueries from "./processEntityQueries.js";
import * as processApiResponse from "./process_api_response.js";

// Export all the functions from the individual modules
// This allows them to be imported and used in other parts of the application
export {
  executeApiCall as create_fetch_request,
  extractParameters as extract_parameters,
  extractCategory as extract_category,
  handleMultiStepQuery as handle_multi_step_query,
  selectApi as select_api,
  verifyParams as verify_params,
  getApis as get_apis,
  ExtractHighLevelCategories as extract_high_level_categories,
  processEntityQueries as process_entity_queries,
  processApiResponse as process_api_response
};