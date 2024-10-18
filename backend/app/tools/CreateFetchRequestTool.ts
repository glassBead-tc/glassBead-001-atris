import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { DatasetSchema, GraphState } from "../types.js";
import { logger } from '../logger.js';
import axios from "axios";
import { globalAudiusApi } from "../services/audiusApi.js";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class CreateFetchRequestTool extends StructuredTool {
  name = "create_fetch_request";
  description = "Creates a fetch request based on the extracted parameters.";

  schema = z.object({
    state: z.object({
      params: z.record(z.any()).describe("Parameters for the fetch request"),
      bestApi: z.any().nullable().optional(),
      // ... include other necessary fields from GraphState
    }),
  });

  async _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>> {
    try {
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
      // Construct the fetch request URL and options
      const url = `${bestApi.base_url}?${new URLSearchParams(params).toString()}`;
      const options = {
        method: bestApi.method || 'GET',
        headers: bestApi.headers || {},
      };

      logger.info(`Created fetch request: ${url} with options: ${JSON.stringify(options)}`);
      return { 
        ...state, 
        fetchRequest: { url, options }, 
        error: false 
      };
    } catch (error) {
      logger.error(`Error in CreateFetchRequestTool: ${error instanceof Error ? error.message : String(error)}`);
      return { 
        ...state, 
        error: true, 
        message: error instanceof Error ? error.message : 'Failed to create fetch request.' 
      };
    }
  }
}

