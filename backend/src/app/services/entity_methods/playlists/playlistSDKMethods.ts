// backend/src/app/services/entity_methods/playlists/playlistSDKMethods.ts

import axios from 'axios';
import {
  PlaylistResponse,
  FavoritesResponse,
  FullPlaylistResponse,
  PlaylistLibrary,
  GetTrendingPlaylistsRequest,
  TrendingPlaylistsResponse,
  GetTrendingPlaylistsTimeEnum,
  SearchFullResponse,
} from '../../../types.js';

export class PlaylistSDKMethods {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Existing methods...

  // Get Playlist by ID
  async getPlaylist(playlistId: string): Promise<PlaylistResponse> {
    const url = `${this.baseUrl}/playlists/${playlistId}`;

    try {
      const response = await axios.get<PlaylistResponse>(url, {
        params: {
          app_name: 'Atris',
        },
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching playlist:', error);
      throw error;
    }
  }

  // Get Favorite Users of a Playlist
  async getPlaylistFavorites(playlistId: string): Promise<FavoritesResponse> {
    const url = `${this.baseUrl}/playlists/${playlistId}/favorites`;

    try {
      const response = await axios.get<FavoritesResponse>(url, {
        params: {
          app_name: 'Atris',
        },
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching playlist favorites:', error);
      throw error;
    }
  }

  // Get Trending Playlists
  async getTrendingPlaylists(params: { time?: string; limit?: number } = {}): Promise<PlaylistResponse> {
    const { time = 'week', limit = 10 } = params;
    const url = `${this.baseUrl}/playlists/trending`;

    try {
      const response = await axios.get<PlaylistResponse>(url, {
        params: {
          time,
          limit,
          app_name: 'Atris',
        },
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching trending playlists:', error);
      throw error;
    }
  }

  async searchPlaylists(query: string): Promise<SearchFullResponse> {
    const url = `${this.baseUrl}/search/playlists`;

    try {
      const response = await axios.get<SearchFullResponse>(url, {
        params: {
          query,
          app_name: 'Atris',
        },
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching playlists:', error);
      throw error;
    }
  }

  // Additional methods as needed...
}