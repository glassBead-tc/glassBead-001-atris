import axios from 'axios';
import { GraphState, DatasetSchema } from "../types.js";
import { formatTrendingTracks } from '../utils/formatResults.js';
import { logger } from '../logger.js';

const API_KEY = process.env.AUDIUS_API_KEY!;
const BASE_URL = 'https://discoveryprovider.audius.co/v1';

class AudiusApi {
  public async request(method: string, endpoint: string, params: any = {}) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      logger.debug('Request URL:', url);
      logger.debug('API request params:', params);

      const response = await axios({
        method,
        url,
        params,
        headers: {
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
          'User-Agent': 'Atris'
        }
      });
      logger.debug('API response:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('API Error occurred:', error.response?.data);
        throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async testConnection() {
    try {
      logger.info('Testing API connection...');
      const response = await this.request('GET', '/tracks/trending', { limit: 1 });
      logger.info('API request successful.');
      return response && response.data && response.data.length > 0;
    } catch (error) {
      logger.error('Error testing API connection:', error);
      if (axios.isAxiosError(error)) {
        logger.error('Response data:', error.response?.data);
        logger.error('Response status:', error.response?.status);
        logger.error('Response headers:', error.response?.headers);
      }
      return false;
    }
  }

  async getTrendingTracks(limit: number = 3) {
    logger.debug(`Getting trending tracks with limit: ${limit}`);
    return this.request('GET', '/tracks/trending', { limit });
  }

  async getTrack(trackId: string) {
    return this.request('GET', `/tracks/${trackId}`);
  }

  async getTopTrendingPlaylist(limit: number = 1) {
    return this.request('GET', '/playlists/trending', { limit });
  }

  async getUserByHandle(handle: string) {
    return this.request('GET', `/users/handle/${handle}`, { handle });
  }

  async searchTracks(query: string, limit: number = 10) {
    return this.request('GET', '/tracks/search', { query, limit });
  }

  async searchUsers(query: string, limit: number = 10, sortBy: string = '', orderBy: string = '') {
    const params: any = { query, limit };
    if (sortBy) params.sort_by = sortBy;
    if (orderBy) params.order_by = orderBy;
    return this.request('GET', '/users/search', params);
  }

  async searchPlaylists(query: string, limit: number = 10) {
    return this.request('GET', '/playlists/search', { query, limit });
  }

  async getPlaylist(playlistId: string) {
    return this.request('GET', `/playlists/${playlistId}`);
  }

  async getTopTrendingPlaylistTracks(limit: number = 5) {
    try {
      const playlists = await this.getTopTrendingPlaylist(1);
      if (!playlists.data || playlists.data.length === 0) {
        logger.warn('No trending playlists found');
        return null;
      }

      const playlistId = playlists.data[0].id;
      const playlist = await this.getPlaylist(playlistId);

      if (!playlist.data || !playlist.data.tracks) {
        logger.warn('Playlist data or tracks not found');
        return null;
      }

      const tracks = playlist.data.tracks.slice(0, limit);
      return { playlist: playlist.data, tracks };
    } catch (error) {
      logger.error('Error in getTopTrendingPlaylistTracks:', error);
      return null;
    }
  }
}

export const globalAudiusApi = new AudiusApi();


export async function createFetchRequest(state: GraphState): Promise<Partial<GraphState>> {
  console.log("Entering createFetchRequest");
  console.log("State:", JSON.stringify(state, null, 2));
  
  try {
    const { bestApi, params } = state;

    if (!bestApi) {
      logger.error("No API selected in createFetchRequest");
      throw new Error("No API selected");
    }

    logger.debug(`Fetching data from ${bestApi.api_name}`, { params });

    let response: any;

    switch (bestApi.api_name) {
      case "/v1/tracks/trending":
        response = await globalAudiusApi.getTrendingTracks(params.limit);
        break;
      case "/v1/users/search":
        response = await globalAudiusApi.searchUsers(params.query, params.limit, params.sort_by, params.order_by);
        break;
      case "/v1/tracks/search":
        response = await globalAudiusApi.searchTracks(params.query, params.limit);
        break;
      case "/v1/playlists/search":
        response = await globalAudiusApi.searchPlaylists(params.query, params.limit);
        break;
      case "/v1/playlists/trending":
        response = await globalAudiusApi.getTopTrendingPlaylist(params.limit);
        break;
      default:
        logger.warn(`Unsupported API endpoint: ${bestApi.api_name}. Attempting generic request.`);
        response = await globalAudiusApi.request('GET', bestApi.api_name, params);
    }

    if (!response || !response.data) {
      logger.error("No data returned from API", { response });
      throw new Error("No data returned from API");
    }

    logger.debug(`Successfully fetched data from ${bestApi.api_name}`);
    return { 
      response,
      message: `Successfully fetched data from ${bestApi.api_name}.`
    };
  } catch (error) {
    console.error("Error in createFetchRequest:", error);
    throw error; // Re-throw the error to be caught by the graph
  }
}

function handleApiError(error: unknown): Partial<GraphState> {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    if (statusCode === 404) {
      return { 
        error: "Requested resource not found",
        message: "The requested resource was not found on the server."
      };
    } else if (statusCode === 429) {
      return { 
        error: "API rate limit exceeded. Please try again later.",
        message: "The API rate limit has been exceeded. Please wait a moment and try again."
      };
    }
  }
  return { 
    error: `An unexpected error occurred: ${(error as Error).message}`,
    message: "An unexpected error occurred while fetching data from the API."
  };
}
