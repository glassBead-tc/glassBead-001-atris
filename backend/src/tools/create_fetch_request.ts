import axios, { AxiosError, AxiosRequestConfig, Method } from 'axios';
import { GraphState } from "../types.js";
import stringSimilarity from 'string-similarity'; // You'll need to install this package

const apiKey = process.env.AUDIUS_API_KEY;
const apiSecret = process.env.AUDIUS_API_SECRET;
const appName = 'Atris';

if (!apiKey || !apiSecret) {
  throw new Error('AUDIUS_API_KEY and AUDIUS_API_SECRET must be set in the environment variables');
}

const BASE_URL = 'https://discoveryprovider.audius.co/v1';
const FETCH_TIMEOUT = 30000; // 30 seconds timeout

// Updated type guard function for AxiosError
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as any).isAxiosError === true
  );
}

export class AudiusApi {
  private async request<T>(endpoint: string, method: Method, params: any = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const config: AxiosRequestConfig = {
      method,
      url,
      params,
      timeout: FETCH_TIMEOUT,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        throw new Error(`API call failed: ${error.message}`);
      }
      throw error;
    }
  }

  async getTrendingTracks(params: any = {}) {
    return this.request<any>('/tracks/trending', 'GET', params);
  }

  async searchTracks(query: string) {
    return this.request<any>('/tracks/search', 'GET', { query });
  }

  async getTrack(trackId: string) {
    return this.request<any>(`/tracks/${trackId}`, 'GET');
  }

  async searchUsers(params: any = {}) {
    return this.request<any>('/users/search', 'GET', params);
  }

  async searchPlaylists(params: any = {}) {
    return this.request<any>('/playlists/search', 'GET', params);
  }

  async getPlaylist(playlistId: string) {
    return this.request<any>(`/playlists/${playlistId}`, 'GET');
  }

  async getUser(userId: string) {
    return this.request<any>(`/users/${userId}`, 'GET');
  }

  private parseQuery(query: string): [string, string] {
    const parts = query.split(' by ');
    if (parts.length === 2) {
      return [parts[0].trim(), parts[1].trim()];
    }
    return [query, ''];
  }

  async getTrackByPermalink(permalink: string) {
    try {
      const url = new URL(permalink.startsWith('http') ? permalink : `https://audius.co${permalink}`);
      const response = await axios.get(url.toString());
      // Extract track ID from the HTML response
      const trackIdMatch = response.data.match(/trackId:\s*['"](\w+)['"]/);
      if (trackIdMatch) {
        return this.getTrack(trackIdMatch[1]);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching track by permalink: ${error}`);
      return null;
    }
  }

  // Add more methods for other endpoints as needed
}

const audiusApi = new AudiusApi();
export { audiusApi };

export async function createFetchRequest(state: GraphState): Promise<GraphState> {
  const { bestApi, params, query } = state;
  if (!bestApi) {
    return { ...state, error: "No best API selected" };
  }

  try {
    let response;
    switch (bestApi.api_name) {
      case "Get Track":
        const searchResponse = await audiusApi.searchTracks(query);
        if (searchResponse && searchResponse.data && searchResponse.data.length > 0) {
          const trackId = searchResponse.data[0].id;
          response = await audiusApi.getTrack(trackId);
        } else {
          return { ...state, error: "No tracks found matching the query" };
        }
        break;
      case "Search Tracks":
        response = await audiusApi.searchTracks(query);
        if (!response || !response.data || response.data.length === 0) {
          return { ...state, error: "No tracks found" };
        }
        break;
      case "Search Users":
        response = await audiusApi.searchUsers(params);
        if (!response || !response.data || response.data.length === 0) {
          return { ...state, error: "No users found" };
        }
        if (response.data && response.data.length > 0) {
          const userId = response.data[0].id;
          response = await audiusApi.getUser(userId);
        }
        break;
      case "Get Trending Tracks":
        response = await audiusApi.getTrendingTracks(params);
        if (!response.data || response.data.length === 0) {
          return { ...state, error: "No trending tracks found" };
        }
        break;
      case "Search Playlists":
        response = await audiusApi.searchPlaylists(params);
        if (!response.data || response.data.length === 0) {
          return { ...state, error: "No playlists found" };
        }
        break;
      case "Get Playlist":
        response = await audiusApi.getPlaylist(params.playlist_id);
        if (!response.data) {
          return { ...state, error: "Playlist not found" };
        }
        break;
      default:
        return { ...state, error: `Unsupported API endpoint: ${bestApi.api_name}` };
    }
    return {
      ...state,
      response: response
    };
  } catch (error) {
    return {
      ...state,
      error: error instanceof Error ? error.message : "An unknown error occurred"
    };
  }
}
