import _ from "lodash";
import { GraphState, Track } from "../types.js";
import stringSimilarity from 'string-similarity'; // You'll need to install this package
import axios, { Method, AxiosError, AxiosRequestConfig } from 'axios';

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

  async getTrendingPlaylists(params: any = {}) {
    return this.request<any>('/playlists/trending', 'GET', params);
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

  async getPlaylistTracks(playlistId: string) {
    return this.request<any>(`/playlists/${playlistId}/tracks`, 'GET');
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

  async getTopTrendingTracks(limit: number = 3) {
    const response = await this.request<any>('/tracks/trending', 'GET', { limit });
    return response.data.slice(0, limit).map((track: any) => ({
      title: track.title,
      artist: track.user.name
    }));
  }

  async getTopTrendingPlaylist(limit: number = 1) {
    const response = await this.request<any>('/playlists/trending', 'GET', { limit });
    return response.data.slice(0, limit).map((playlist: any) => ({
      title: playlist.playlist_name,
      artist: playlist.user.name
    }));
  }

  async getTopTrendingPlaylistTracks(playlistLimit: number = 1, trackLimit: number = 3) {
    try {
      // Get the top trending playlist
      const trendingPlaylistsResponse = await this.getTrendingPlaylists({ limit: playlistLimit });
      
      if (!trendingPlaylistsResponse.data || trendingPlaylistsResponse.data.length === 0) {
        return null;
      }

      const topPlaylist = trendingPlaylistsResponse.data[0];

      // Fetch tracks for the top playlist
      const playlistTracks = await this.getPlaylistTracks(topPlaylist.id);
      
      return {
        playlist: {
          id: topPlaylist.id,
          name: topPlaylist.playlist_name,
          user: topPlaylist.user.name
        },
        tracks: playlistTracks.data
          .slice(0, trackLimit)
          .map((track: any) => ({
            title: track.title,
            artist: track.user.name
          }))
      };
    } catch (error) {
      console.error('Error fetching trending playlist tracks:', error);
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
    return { ...state, error: "No best API selected." };
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
          return { ...state, error: "No tracks found matching the query." };
        }
        break;
      case "Search Tracks":
        response = await audiusApi.searchTracks(query);
        if (!response || !response.data || response.data.length === 0) {
          return { ...state, error: "No tracks found." };
        }
        break;
      case "Search Users":
        response = await audiusApi.searchUsers(params);
        if (!response || !response.data || response.data.length === 0) {
          return { ...state, error: "No users found." };
        }
        if (response.data && response.data.length > 0) {
          const userId = response.data[0].id;
          response = await audiusApi.getUser(userId);
        }
        break;
      case "Get Trending Tracks":
        response = await audiusApi.getTrendingTracks(params);
        if (!response.data || response.data.length === 0) {
          return { ...state, error: "No trending tracks found." };
        }
        break;
      case "Search Playlists":
        response = await audiusApi.searchPlaylists(params);
        if (!response.data || response.data.length === 0) {
          return { ...state, error: "No playlists found." };
        }
        break;
      case "Get Playlist":
        response = await audiusApi.getPlaylist(params.playlist_id);
        if (!response.data) {
          return { ...state, error: "Playlist not found." };
        }
        break;
      case "Get Trending Playlists":
      case "Get Trending Playlist Tracks":
        const playlistLimit = toNumber(params.playlist_limit) || 1;
        const trackLimit = toNumber(params.track_limit) || 3;
        try {
          response = await audiusApi.getTopTrendingPlaylistTracks(playlistLimit, trackLimit);
          if (!response) {
            return { ...state, error: "No trending playlist found." };
          }
          // Format the response to match the expected output
          const formattedResponse = {
            name: response.playlist.name,
            user: response.playlist.user,
            tracks: response.tracks.map((track: { title: string; artist: string }) => 
              `${track.title} by ${track.artist}`
            ).join(', ')
          };
          return {
            ...state,
            response: formattedResponse
          };
        } catch (error) {
          console.error('Error in Get Trending Playlists:', error);
          return { ...state, error: "Failed to fetch trending playlist. Please try again later." };
        }
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

function toNumber(value: any): number | undefined {
  if (typeof value === 'number') {
    return value;
  } else if (typeof value === 'string') {
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}