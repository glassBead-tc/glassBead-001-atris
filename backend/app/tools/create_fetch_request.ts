import axios, { AxiosError } from 'axios';
import { GraphState, DatasetSchema } from "../types.js";

const API_KEY = process.env.AUDIUS_API_KEY!;
const BASE_URL = 'https://discoveryprovider.audius.co/v1';

class AudiusApi {
  private async request(method: string, endpoint: string, params: any = {}) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      console.log('Request URL:', url);
      // Remove request headers logging
      console.log('API request initiated.');

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
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error occurred.');
        throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async testConnection() {
    try {
      console.log('Testing API connection...');
      const response = await this.request('GET', '/tracks/trending', { limit: 1 });
      console.log('API request successful.');
      return response && response.data && response.data.length > 0;
    } catch (error) {
      console.error('Error testing API connection:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
        console.error('Response headers:', error.response?.headers);
      }
      return false;
    }
  }

  async getTrendingTracks(limit: number = 3) {
    return this.request('GET', '/tracks/trending', { limit });
  }

  async getTrack(trackId: string) {
    return this.request('GET', `/tracks/${trackId}`);
  }

  async getTopTrendingPlaylist(limit: number = 1) {
    return this.request('GET', '/playlists/trending', { limit });
  }

  async getUserByHandle(handle: string) {
    const response = await this.request('GET', `/users/handle/${handle}`, { handle });
    return response;
  }

  async searchTracks(query: string, limit: number = 10) {
    return this.request('GET', '/tracks/search', { query, limit });
  }

  async searchUsers(query: string, limit: number = 10) {
    return this.request('GET', '/users/search', { query, limit });
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
        console.error('No trending playlists found');
        return null;
      }

      const playlistId = playlists.data[0].id;
      const playlist = await this.getPlaylist(playlistId);

      if (!playlist.data || !playlist.data.tracks) {
        console.error('Playlist data or tracks not found');
        return null;
      }

      const tracks = playlist.data.tracks.slice(0, limit);
      return { playlist: playlist.data, tracks };
    } catch (error) {
      console.error('Error in getTopTrendingPlaylistTracks:', error);
      return null;
    }
  }
}

export const globalAudiusApi = new AudiusApi();

export async function createFetchRequest(state: GraphState): Promise<Partial<GraphState>> {
  const { bestApi, params } = state;

  if (!bestApi) {
    return { error: "No API selected" };
  }

  try {
    let response: any;

    switch (bestApi.api_name) {
      case "Get User By Handle":
        response = await globalAudiusApi.getUserByHandle(params.handle);
        break;
      case "Get Playlist":
        response = await globalAudiusApi.getPlaylist(params.playlist_id);
        break;
      case "Search Playlists":
        response = await globalAudiusApi.searchPlaylists(params.query);
        break;
      case "Get Track":
        response = await globalAudiusApi.getTrack(params.track_id);
        break;
      case "Search Tracks":
        response = await globalAudiusApi.searchTracks(params.query);
        break;
      case "Get Trending Tracks":
        response = await globalAudiusApi.getTrendingTracks(params.limit);
        break;
      default:
        return { error: `Unsupported API endpoint: ${bestApi.api_name}` };
    }

    return { response };
  } catch (error) {
    console.error('Error in createFetchRequest:', error);
    return { error: "Failed to fetch data from API" };
  }
}