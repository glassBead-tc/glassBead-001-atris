import axios from 'axios';
import { DatasetSchema } from "../types.js";
import { logger } from '../logger.js';
import { globalAudiusApi } from '../services/audiusApi.js'; // Correct import path

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Determines if an error is retryable based on its type and status code.
 * @param error - The error object to evaluate.
 * @returns A boolean indicating if the error is retryable.
 */
function isRetryableError(error: any): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    return status === 500 || status === 502 || status === 503 || status === 504;
  }
  return false;
}

/**
 * Executes the specified API call with given parameters, handling retries for retryable errors.
 * @param api - The dataset schema representing the API to call.
 * @param params - The parameters required for the API call.
 * @param retryCount - The current retry attempt count.
 * @returns The API response data.
 */
export async function executeApiCall(
  api: DatasetSchema, 
  params: Record<string, any>, 
  retryCount = 0
): Promise<any> {
  try {
    switch (api.api_name) {
      case "Search Users":
        return await globalAudiusApi.searchUsers(params.query, params.limit);
      case "Search Tracks":
        return await globalAudiusApi.searchTracks(params.query, params.limit);
      case "Search Playlists":
        return await globalAudiusApi.searchPlaylists(params.query, params.limit);
      case "Get Trending Tracks":
        return await globalAudiusApi.getTrendingTracks(params.limit);
      case "Get User Followers":
        if (!params.userId) throw new Error("User ID is required for Get User Followers API");
        return await globalAudiusApi.getUserFollowers(params.userId, params.limit);
      case "Get User Following":
        if (!params.userId) throw new Error("User ID is required for Get User Following API");
        return await globalAudiusApi.getUserFollowing(params.userId, params.limit);
      // ... handle other cases ...
      default:
        throw new Error(`Unknown API name: ${api.api_name}`);
    }
  } catch (error: any) {
    logger.error(`Error executing API call for ${api.api_name}:`, error);
    if (retryCount < MAX_RETRIES && isRetryableError(error)) {
      logger.warn(`Retrying API call to ${api.api_name} (Attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return executeApiCall(api, params, retryCount + 1);
    } else {
      logger.error(`API call to ${api.api_name} failed: ${error.message || String(error)}`);
      throw error; // Propagate the error to be handled upstream
    }
  }
}

/**
 * Validates that all required parameters for the API call are present.
 * @param api - The dataset schema representing the API to call.
 * @param params - The parameters provided for the API call.
 */
function validateParams(api: DatasetSchema, params: Record<string, any>): void {
  api.required_parameters.forEach(param => {
    if (!params[param.name]) {
      throw new Error(`Missing required parameter: ${param.name} for API ${api.api_name}`);
    }
  });
}