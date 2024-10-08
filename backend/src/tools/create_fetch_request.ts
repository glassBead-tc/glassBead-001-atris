import axios, { AxiosError, AxiosRequestConfig, Method } from 'axios';
import { GraphState } from "../types.js";

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

  async searchTracks(params: any = {}) {
    return this.request<any>('/tracks/search', 'GET', params);
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

  // Add more methods for other endpoints as needed
}

const audiusApi = new AudiusApi();

export async function createFetchRequest(state: GraphState): Promise<GraphState> {
  const { bestApi, params } = state;
  if (!bestApi) {
    throw new Error("No best API selected");
  }

  try {
    let response;
    switch (bestApi.api_url) {
      case "/v1/tracks/trending":
        response = await audiusApi.getTrendingTracks(params);
        break;
      case "/v1/tracks/search":
        response = await audiusApi.searchTracks(params);
        break;
      case "/v1/playlists/search":
        response = await audiusApi.searchPlaylists(params);
        break;
      case "/v1/playlists/{playlist_id}":
        response = await audiusApi.getPlaylist(params.playlist_id);
        break;
      // Add more cases for other endpoints as needed
      default:
        throw new Error(`Unsupported API endpoint: ${bestApi.api_url}`);
    }
    return {
      ...state,
      response: response
    };
  } catch (error) {
    throw error;
  }
}
