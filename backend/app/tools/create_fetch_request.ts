import axios from 'axios';
import { GraphState, DatasetSchema } from "../types.js";
import { logger } from '../logger.js';
import { globalAudiusApi } from '../services/audiusApi.js';
export { globalAudiusApi };

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

function isRetryableError(error: any): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    return status === 500 || status === 502 || status === 503 || status === 504;
  }
  return false;
}

export async function executeApiCall(api: DatasetSchema, params: Record<string, any>, retryCount = 0): Promise<any> {
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
      case "Get User Tracks":
        if (!params.user_id) throw new Error("User ID is required for Get User Tracks API");
        return await globalAudiusApi.getUserTracks(params.user_id, params.limit);
      case "Get User Followers":
        if (!params.user_id) throw new Error("User ID is required for Get User Followers API");
        return await globalAudiusApi.getUserFollowers(params.user_id, params.limit);
      case "Get User Following":
        if (!params.user_id) throw new Error("User ID is required for Get User Following API");
        return await globalAudiusApi.getUserFollowing(params.user_id, params.limit);
      default:
        throw new Error(`Unsupported API endpoint: ${api.api_name}`);
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES && isRetryableError(error)) {
      logger.warn(`Retrying API call to ${api.api_name} (Attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return executeApiCall(api, params, retryCount + 1);
    } else {
      logger.error(`API call to ${api.api_name} failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

function validateParams(api: DatasetSchema, params: Record<string, any>): void {
  api.required_parameters.forEach(param => {
    if (!params[param.name]) {
      throw new Error(`Missing required parameter: ${param.name} for API ${api.api_name}`);
    }
  });
}

export async function createFetchRequest(state: Partial<GraphState>): Promise<Partial<GraphState>> {
  const { bestApi, params } = state;

  if (!bestApi) {
    throw new Error('No API selected');
  }

  try {
    logger.info(`Executing API call for ${bestApi.api_name}`);
    
    const response = await executeApiCall(bestApi, params || {});
    
    return {
      response: response,
      error: null,
      message: `Successfully fetched data from ${bestApi.api_name}.`
    };
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown): Partial<GraphState> {
  if (axios.isAxiosError(error) && error.response) {
    const statusCode = error.response.status;
    const errorMessage = error.response.data?.message || error.message;
    logger.error(`API Error: ${statusCode} - ${errorMessage}`);
    
    switch (statusCode) {
      case 400:
        return {
          error: "Bad Request",
          message: `The request was invalid: ${errorMessage}. Please check your input and try again.`
        };
      case 401:
        return {
          error: "Unauthorized",
          message: "Authentication failed. Please check your API key."
        };
      case 403:
        return {
          error: "Forbidden",
          message: "You don't have permission to access this resource."
        };
      case 404:
        return {
          error: "Not Found",
          message: `The requested resource was not found: ${errorMessage}. Please check your input and try again.`
        };
      case 429:
        return {
          error: "Rate Limit Exceeded",
          message: "We've hit the API rate limit. Please try again in a moment."
        };
      default:
        return {
          error: "API Error",
          message: `An unexpected error occurred: ${errorMessage}`
        };
    }
  } else if (error instanceof Error) {
    logger.error(`Application Error: ${error.message}`);
    return {
      error: "Application Error",
      message: `An error occurred in the application: ${error.message}`
    };
  }
  logger.error(`Unexpected Error: ${String(error)}`);
  return {
    error: "Unexpected Error",
    message: "An unexpected error occurred. Please try again later."
  };
}